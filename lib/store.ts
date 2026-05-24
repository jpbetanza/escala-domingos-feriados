import { create } from 'zustand'
import { AppState, Vendor, Holiday, Schedule, ScheduleEntry } from '@/types'
import { nanoid } from 'nanoid'
import { toast } from 'sonner'
import * as db from './supabase/db'
import { computeExpectedDates } from './scheduler'

const DEFAULT_VENDOR_SEEDS = [
  { name: 'Matilde' },
  { name: 'Rivânia' },
  { name: 'Lúcia' },
  { name: 'Patrícia' },
  { name: 'Léo' },
  { name: 'André' },
]

/**
 * Sync the schedule calendar dates with the current holidays for a given year.
 * Adds missing entries, removes orphaned holiday entries, and updates types.
 * Only runs if a schedule already exists for the year.
 */
async function _syncScheduleDates(
  year: number,
  get: () => AppState,
  set: (partial: Partial<AppState> | ((s: AppState) => Partial<AppState>)) => void
) {
  const { activeUserId, schedules, holidays } = get()
  if (!activeUserId) return
  const schedule = schedules[year]
  if (!schedule) return

  const yearHolidays = holidays[year] ?? []
  const expected = computeExpectedDates(year, yearHolidays)
  const expectedMap = new Map(expected.map((e) => [e.date, e]))
  const existingMap = new Map(schedule.entries.map((e) => [e.date, e]))

  let added = 0
  let removed = 0
  let updated = 0
  const newEntries: ScheduleEntry[] = []

  // Keep or update existing entries
  for (const entry of schedule.entries) {
    const exp = expectedMap.get(entry.date)
    if (!exp) {
      // Date no longer expected — keep if locked, remove otherwise
      if (entry.locked) {
        newEntries.push(entry)
      } else {
        removed++
      }
      continue
    }
    // Date still expected — keep assignments/locks, but sync calendar metadata.
    if (entry.type !== exp.type || entry.note !== exp.note) {
      newEntries.push({ ...entry, type: exp.type, note: exp.note })
      updated++
    } else {
      newEntries.push(entry)
    }
  }

  // Add new dates not in existing entries
  for (const exp of expected) {
    if (!existingMap.has(exp.date)) {
      newEntries.push({
        id: nanoid(),
        date: exp.date,
        type: exp.type,
        vendorIds: [],
        closed: false,
        note: exp.note,
      })
      added++
    }
  }

  if (added === 0 && removed === 0 && updated === 0) return

  // Sort chronologically
  newEntries.sort((a, b) => a.date.localeCompare(b.date))

  const updatedSchedule: Schedule = { ...schedule, entries: newEntries }
  set((s) => ({ schedules: { ...s.schedules, [year]: updatedSchedule } }))
  try {
    await db.dbSetSchedule(activeUserId, year, updatedSchedule)
  } catch {
    // Rollback on error
    set((s) => ({ schedules: { ...s.schedules, [year]: schedule } }))
    toast.error('Erro ao atualizar cronograma.')
    return
  }

  const parts: string[] = []
  if (added > 0) parts.push(`${added} adicionada(s)`)
  if (removed > 0) parts.push(`${removed} removida(s)`)
  if (updated > 0) parts.push(`${updated} atualizada(s)`)
  toast.success(`Cronograma de ${year} atualizado`, {
    description: `${parts.join(', ')}.`,
  })
}

export const useStore = create<AppState>()((set, get) => ({
  vendors: [],
  holidays: {},
  schedules: {},
  sessionUserId: null,
  sessionUserEmail: null,
  sessionUserAvatar: null,
  activeUserId: null,
  activeUserEmail: null,
  activeUserAvatar: null,
  manageableUsers: [],
  isAdmin: false,
  isLoadingData: false,

  // ── Auth ────────────────────────────────────────────────────────────────────

  setUser(userId, email, avatar) {
    set({
      sessionUserId: userId,
      sessionUserEmail: email,
      sessionUserAvatar: avatar,
      activeUserId: userId,
      activeUserEmail: email,
      activeUserAvatar: avatar,
      manageableUsers: [{ userId, email, avatarUrl: avatar }],
      isAdmin: false,
    })
  },

  async loadManageableUsers() {
    try {
      const { users, isAdmin } = await db.fetchManageableUsers()
      const { sessionUserId, sessionUserEmail, sessionUserAvatar, activeUserId } = get()
      const fallbackUser =
        sessionUserId === null
          ? null
          : { userId: sessionUserId, email: sessionUserEmail, avatarUrl: sessionUserAvatar }
      const manageableUsers = users.length > 0 ? users : fallbackUser ? [fallbackUser] : []
      const activeUser =
        manageableUsers.find((u) => u.userId === activeUserId) ??
        manageableUsers.find((u) => u.userId === sessionUserId) ??
        manageableUsers[0] ??
        null

      set({
        manageableUsers,
        isAdmin,
        activeUserId: activeUser?.userId ?? sessionUserId,
        activeUserEmail: activeUser?.email ?? sessionUserEmail,
        activeUserAvatar: activeUser?.avatarUrl ?? sessionUserAvatar,
      })
    } catch (err) {
      console.error('[loadManageableUsers]', err)
      toast.error('Erro ao carregar usuários.')
    }
  },

  async loadUserData(userId) {
    set({ isLoadingData: true })
    try {
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout ao carregar dados')), 8_000)
      )
      const data = await Promise.race([db.fetchAllUserData(userId), timeout])
      set({
        vendors: data.vendors,
        holidays: data.holidays,
        schedules: data.schedules,
        isLoadingData: false,
      })
    } catch (err) {
      console.error('[loadUserData]', err)
      set({ isLoadingData: false })
      toast.error('Erro ao carregar dados.')
    }
  },

  async switchActiveUser(userId) {
    const { isAdmin, sessionUserId, manageableUsers } = get()
    if (!isAdmin && userId !== sessionUserId) return

    const user = manageableUsers.find((u) => u.userId === userId)
    set({
      activeUserId: userId,
      activeUserEmail: user?.email ?? null,
      activeUserAvatar: user?.avatarUrl ?? null,
      vendors: [],
      holidays: {},
      schedules: {},
    })
    await get().loadUserData(userId)
  },

  async seedDefaultVendors(userId) {
    const vendors: Vendor[] = DEFAULT_VENDOR_SEEDS.map((s) => ({
      id: nanoid(),
      name: s.name,
      active: true,
    }))
    set({ vendors })
    try {
      await db.dbSeedVendors(userId, vendors)
    } catch {
      toast.error('Erro ao salvar vendedores padrão.')
    }
  },

  resetStore() {
    set({
      vendors: [],
      holidays: {},
      schedules: {},
      sessionUserId: null,
      sessionUserEmail: null,
      sessionUserAvatar: null,
      activeUserId: null,
      activeUserEmail: null,
      activeUserAvatar: null,
      manageableUsers: [],
      isAdmin: false,
      isLoadingData: false,
    })
  },

  // ── Vendors ─────────────────────────────────────────────────────────────────

  async addVendor(name) {
    const { activeUserId } = get()
    if (!activeUserId) return
    const vendor: Vendor = { id: nanoid(), name, active: true }
    set((s) => ({ vendors: [...s.vendors, vendor] }))
    try {
      await db.dbAddVendor(activeUserId, vendor)
    } catch {
      set((s) => ({ vendors: s.vendors.filter((v) => v.id !== vendor.id) }))
      toast.error('Erro ao salvar vendedor.')
    }
  },

  async updateVendor(id, data) {
    const { activeUserId } = get()
    if (!activeUserId) return
    const prev = get().vendors
    set((s) => ({
      vendors: s.vendors.map((v) => (v.id === id ? { ...v, ...data } : v)),
    }))
    try {
      await db.dbUpdateVendor(activeUserId, id, data)
    } catch {
      set({ vendors: prev })
      toast.error('Erro ao atualizar vendedor.')
    }
  },

  async removeVendor(id) {
    const { activeUserId } = get()
    if (!activeUserId) return
    const prev = get().vendors
    set((s) => ({ vendors: s.vendors.filter((v) => v.id !== id) }))
    try {
      await db.dbRemoveVendor(activeUserId, id)
    } catch {
      set({ vendors: prev })
      toast.error('Erro ao remover vendedor.')
    }
  },

  // ── Holidays ─────────────────────────────────────────────────────────────────

  async addHoliday(year, holiday) {
    const { activeUserId } = get()
    if (!activeUserId) return
    const existing = get().holidays[year] ?? []
    if (existing.some((h) => h.date === holiday.date)) return
    const newHoliday: Holiday = { ...holiday, id: nanoid() }
    set((s) => ({
      holidays: {
        ...s.holidays,
        [year]: [...(s.holidays[year] ?? []), newHoliday],
      },
    }))
    try {
      await db.dbAddHoliday(activeUserId, year, newHoliday)
      await _syncScheduleDates(year, get, set)
    } catch {
      set((s) => ({
        holidays: {
          ...s.holidays,
          [year]: (s.holidays[year] ?? []).filter((h) => h.id !== newHoliday.id),
        },
      }))
      toast.error('Erro ao salvar feriado.')
    }
  },

  async addHolidays(year, holidays) {
    const { activeUserId } = get()
    if (!activeUserId) return
    const existing = get().holidays[year] ?? []
    const existingDates = new Set(existing.map((h) => h.date))
    const newOnes: Holiday[] = holidays
      .filter((h) => !existingDates.has(h.date))
      .map((h) => ({ ...h, id: nanoid() }))
    if (newOnes.length === 0) return
    set((s) => ({
      holidays: {
        ...s.holidays,
        [year]: [...(s.holidays[year] ?? []), ...newOnes],
      },
    }))
    try {
      await db.dbAddHolidays(activeUserId, year, newOnes)
      await _syncScheduleDates(year, get, set)
    } catch {
      set((s) => {
        const ids = new Set(newOnes.map((h) => h.id))
        return {
          holidays: {
            ...s.holidays,
            [year]: (s.holidays[year] ?? []).filter((h) => !ids.has(h.id)),
          },
        }
      })
      toast.error('Erro ao salvar feriados.')
    }
  },

  async updateHoliday(year, id, data) {
    const { activeUserId } = get()
    if (!activeUserId) return
    const prev = get().holidays
    set((s) => ({
      holidays: {
        ...s.holidays,
        [year]: (s.holidays[year] ?? []).map((h) => (h.id === id ? { ...h, ...data } : h)),
      },
    }))
    try {
      await db.dbUpdateHoliday(activeUserId, id, data)
      await _syncScheduleDates(year, get, set)
    } catch {
      set({ holidays: prev })
      toast.error('Erro ao atualizar feriado.')
    }
  },

  async removeHoliday(year, id) {
    const { activeUserId } = get()
    if (!activeUserId) return
    const prev = get().holidays
    set((s) => ({
      holidays: {
        ...s.holidays,
        [year]: (s.holidays[year] ?? []).filter((h) => h.id !== id),
      },
    }))
    try {
      await db.dbRemoveHoliday(activeUserId, id)
      await _syncScheduleDates(year, get, set)
    } catch {
      set({ holidays: prev })
      toast.error('Erro ao remover feriado.')
    }
  },

  async setHolidays(year, holidays) {
    const { activeUserId } = get()
    if (!activeUserId) return
    const prev = get().holidays
    const newHolidays: Holiday[] = holidays.map((h) => ({ ...h, id: nanoid() }))
    // Preserve special dates when replacing holidays (e.g. national import)
    const specials = (get().holidays[year] ?? []).filter((h) => h.type === 'special')
    set((s) => ({
      holidays: { ...s.holidays, [year]: [...specials, ...newHolidays] },
    }))
    try {
      await db.dbSetHolidays(activeUserId, year, newHolidays)
      await _syncScheduleDates(year, get, set)
    } catch {
      set({ holidays: prev })
      toast.error('Erro ao importar feriados.')
    }
  },

  // ── Schedules ────────────────────────────────────────────────────────────────

  async setSchedule(year, schedule) {
    const { activeUserId } = get()
    if (!activeUserId) return
    const prev = get().schedules
    set((s) => ({ schedules: { ...s.schedules, [year]: schedule } }))
    try {
      await db.dbSetSchedule(activeUserId, year, schedule)
    } catch {
      set({ schedules: prev })
      toast.error('Erro ao salvar cronograma.')
    }
  },

  async updateEntry(year, entryId, data) {
    const { activeUserId } = get()
    if (!activeUserId) return
    const prev = get().schedules
    set((s) => {
      const schedule = s.schedules[year]
      if (!schedule) return s
      return {
        schedules: {
          ...s.schedules,
          [year]: {
            ...schedule,
            entries: schedule.entries.map((e) =>
              e.id === entryId ? { ...e, ...data } : e
            ),
          },
        },
      }
    })
    try {
      await db.dbUpdateEntry(activeUserId, entryId, data)
    } catch {
      set({ schedules: prev })
      toast.error('Erro ao atualizar entrada.')
    }
  },

  async setEntriesLocked(year, entryIds, locked) {
    const { activeUserId } = get()
    if (!activeUserId) return
    const prev = get().schedules
    const idSet = new Set(entryIds)
    set((s) => {
      const schedule = s.schedules[year]
      if (!schedule) return s
      return {
        schedules: {
          ...s.schedules,
          [year]: {
            ...schedule,
            entries: schedule.entries.map((e) =>
              idSet.has(e.id) ? { ...e, locked } : e
            ),
          },
        },
      }
    })
    try {
      await db.dbSetEntriesLocked(activeUserId, entryIds, locked)
    } catch {
      set({ schedules: prev })
      toast.error('Erro ao travar/destravar entradas.')
    }
  },

  async clearUnlockedVendors(year) {
    const { activeUserId } = get()
    if (!activeUserId) return
    const prev = get().schedules
    set((s) => {
      const schedule = s.schedules[year]
      if (!schedule) return s
      return {
        schedules: {
          ...s.schedules,
          [year]: {
            ...schedule,
            entries: schedule.entries.map((e) =>
              e.locked ? e : { ...e, vendorIds: [] }
            ),
          },
        },
      }
    })
    try {
      await db.dbClearUnlockedVendors(activeUserId, year)
    } catch {
      set({ schedules: prev })
      toast.error('Erro ao limpar vendedores.')
    }
  },

  async removeSchedule(year) {
    const { activeUserId } = get()
    if (!activeUserId) return
    const prev = get().schedules
    set((s) => {
      const { [year]: _, ...rest } = s.schedules
      return { schedules: rest }
    })
    try {
      await db.dbRemoveSchedule(activeUserId, year)
    } catch {
      set({ schedules: prev })
      toast.error('Erro ao remover cronograma.')
    }
  },
}))
