import { create } from 'zustand'
import { AppState, Vendor, Holiday, Schedule, ScheduleEntry } from '@/types'
import { nanoid } from 'nanoid'
import { toast } from 'sonner'
import * as db from './supabase/db'

const DEFAULT_VENDOR_SEEDS = [
  { name: 'Matilde' },
  { name: 'Rivânia' },
  { name: 'Lúcia' },
  { name: 'Patrícia' },
  { name: 'Léo' },
  { name: 'André' },
]

export const useStore = create<AppState>()((set, get) => ({
  vendors: [],
  holidays: {},
  schedules: {},
  userId: null,
  userEmail: null,
  userAvatar: null,
  isLoadingData: false,

  // ── Auth ────────────────────────────────────────────────────────────────────

  setUser(userId, email, avatar) {
    set({ userId, userEmail: email, userAvatar: avatar })
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
      userId: null,
      userEmail: null,
      userAvatar: null,
      isLoadingData: false,
    })
  },

  // ── Vendors ─────────────────────────────────────────────────────────────────

  async addVendor(name) {
    const { userId } = get()
    if (!userId) return
    const vendor: Vendor = { id: nanoid(), name, active: true }
    set((s) => ({ vendors: [...s.vendors, vendor] }))
    try {
      await db.dbAddVendor(userId, vendor)
    } catch {
      set((s) => ({ vendors: s.vendors.filter((v) => v.id !== vendor.id) }))
      toast.error('Erro ao salvar vendedor.')
    }
  },

  async updateVendor(id, data) {
    const { userId } = get()
    if (!userId) return
    const prev = get().vendors
    set((s) => ({
      vendors: s.vendors.map((v) => (v.id === id ? { ...v, ...data } : v)),
    }))
    try {
      await db.dbUpdateVendor(userId, id, data)
    } catch {
      set({ vendors: prev })
      toast.error('Erro ao atualizar vendedor.')
    }
  },

  async removeVendor(id) {
    const { userId } = get()
    if (!userId) return
    const prev = get().vendors
    set((s) => ({ vendors: s.vendors.filter((v) => v.id !== id) }))
    try {
      await db.dbRemoveVendor(userId, id)
    } catch {
      set({ vendors: prev })
      toast.error('Erro ao remover vendedor.')
    }
  },

  // ── Holidays ─────────────────────────────────────────────────────────────────

  async addHoliday(year, holiday) {
    const { userId } = get()
    if (!userId) return
    const newHoliday: Holiday = { ...holiday, id: nanoid() }
    set((s) => ({
      holidays: {
        ...s.holidays,
        [year]: [...(s.holidays[year] ?? []), newHoliday],
      },
    }))
    try {
      await db.dbAddHoliday(userId, year, newHoliday)
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
    const { userId } = get()
    if (!userId) return
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
      await db.dbAddHolidays(userId, year, newOnes)
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
    const { userId } = get()
    if (!userId) return
    const prev = get().holidays
    set((s) => ({
      holidays: {
        ...s.holidays,
        [year]: (s.holidays[year] ?? []).map((h) => (h.id === id ? { ...h, ...data } : h)),
      },
    }))
    try {
      await db.dbUpdateHoliday(userId, id, data)
    } catch {
      set({ holidays: prev })
      toast.error('Erro ao atualizar feriado.')
    }
  },

  async removeHoliday(year, id) {
    const { userId } = get()
    if (!userId) return
    const prev = get().holidays
    set((s) => ({
      holidays: {
        ...s.holidays,
        [year]: (s.holidays[year] ?? []).filter((h) => h.id !== id),
      },
    }))
    try {
      await db.dbRemoveHoliday(userId, id)
    } catch {
      set({ holidays: prev })
      toast.error('Erro ao remover feriado.')
    }
  },

  async setHolidays(year, holidays) {
    const { userId } = get()
    if (!userId) return
    const prev = get().holidays
    const newHolidays: Holiday[] = holidays.map((h) => ({ ...h, id: nanoid() }))
    set((s) => ({
      holidays: { ...s.holidays, [year]: newHolidays },
    }))
    try {
      await db.dbSetHolidays(userId, year, newHolidays)
    } catch {
      set({ holidays: prev })
      toast.error('Erro ao importar feriados.')
    }
  },

  // ── Schedules ────────────────────────────────────────────────────────────────

  async setSchedule(year, schedule) {
    const { userId } = get()
    if (!userId) return
    const prev = get().schedules
    set((s) => ({ schedules: { ...s.schedules, [year]: schedule } }))
    try {
      await db.dbSetSchedule(userId, year, schedule)
    } catch {
      set({ schedules: prev })
      toast.error('Erro ao salvar cronograma.')
    }
  },

  async updateEntry(year, entryId, data) {
    const { userId } = get()
    if (!userId) return
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
      await db.dbUpdateEntry(userId, entryId, data)
    } catch {
      set({ schedules: prev })
      toast.error('Erro ao atualizar entrada.')
    }
  },

  async setEntriesLocked(year, entryIds, locked) {
    const { userId } = get()
    if (!userId) return
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
      await db.dbSetEntriesLocked(userId, entryIds, locked)
    } catch {
      set({ schedules: prev })
      toast.error('Erro ao travar/destravar entradas.')
    }
  },

  async clearUnlockedVendors(year) {
    const { userId } = get()
    if (!userId) return
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
      await db.dbClearUnlockedVendors(userId, year)
    } catch {
      set({ schedules: prev })
      toast.error('Erro ao limpar vendedores.')
    }
  },

  async removeSchedule(year) {
    const { userId } = get()
    if (!userId) return
    const prev = get().schedules
    set((s) => {
      const { [year]: _, ...rest } = s.schedules
      return { schedules: rest }
    })
    try {
      await db.dbRemoveSchedule(userId, year)
    } catch {
      set({ schedules: prev })
      toast.error('Erro ao remover cronograma.')
    }
  },
}))
