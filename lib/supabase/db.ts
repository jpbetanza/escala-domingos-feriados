import { createClient } from './client'
import { Vendor, Holiday, Schedule, ScheduleEntry } from '@/types'

// ─────────────────────────────────────────────────────────────────────────────
// Fetch all user data in parallel
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchAllUserData(userId: string): Promise<{
  vendors: Vendor[]
  holidays: Record<number, Holiday[]>
  schedules: Record<number, Schedule>
}> {
  const supabase = createClient()

  const [vendorsRes, holidaysRes, schedulesRes, entriesRes] = await Promise.all([
    supabase
      .from('escala_vendors')
      .select('id, name, active')
      .eq('user_id', userId),
    supabase
      .from('escala_holidays')
      .select('id, year, date, name')
      .eq('user_id', userId),
    supabase
      .from('escala_schedules')
      .select('year, vendors_per_day')
      .eq('user_id', userId),
    supabase
      .from('escala_entries')
      .select('id, year, date, type, vendor_ids, closed, locked, note')
      .eq('user_id', userId),
  ])

  if (vendorsRes.error) throw vendorsRes.error
  if (holidaysRes.error) throw holidaysRes.error
  if (schedulesRes.error) throw schedulesRes.error
  if (entriesRes.error) throw entriesRes.error

  // Build vendors
  const vendors: Vendor[] = (vendorsRes.data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    active: r.active,
  }))

  // Build holidays grouped by year
  const holidays: Record<number, Holiday[]> = {}
  for (const r of holidaysRes.data ?? []) {
    if (!holidays[r.year]) holidays[r.year] = []
    holidays[r.year].push({ id: r.id, date: r.date, name: r.name })
  }

  // Build schedules with entries
  const schedules: Record<number, Schedule> = {}
  for (const r of schedulesRes.data ?? []) {
    const yearEntries = (entriesRes.data ?? [])
      .filter((e) => e.year === r.year)
      .map((e) => ({
        id: e.id,
        date: e.date,
        type: e.type as 'sunday' | 'holiday',
        vendorIds: e.vendor_ids as string[],
        closed: e.closed,
        locked: e.locked ?? false,
        note: e.note ?? undefined,
      } satisfies ScheduleEntry))
      .sort((a, b) => a.date.localeCompare(b.date))

    schedules[r.year] = {
      year: r.year,
      vendorsPerDay: r.vendors_per_day as 2 | 3,
      entries: yearEntries,
    }
  }

  return { vendors, holidays, schedules }
}

// ─────────────────────────────────────────────────────────────────────────────
// Vendors
// ─────────────────────────────────────────────────────────────────────────────

export async function dbAddVendor(userId: string, vendor: Vendor): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('escala_vendors').insert({
    id: vendor.id,
    user_id: userId,
    name: vendor.name,
    active: vendor.active,
  })
  if (error) throw error
}

export async function dbUpdateVendor(
  userId: string,
  id: string,
  data: Partial<Omit<Vendor, 'id'>>
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('escala_vendors')
    .update(data)
    .eq('id', id)
    .eq('user_id', userId)
  if (error) throw error
}

export async function dbRemoveVendor(userId: string, id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('escala_vendors')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)
  if (error) throw error
}

export async function dbSeedVendors(userId: string, vendors: Vendor[]): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('escala_vendors').insert(
    vendors.map((v) => ({ id: v.id, user_id: userId, name: v.name, active: v.active }))
  )
  if (error) throw error
}

// ─────────────────────────────────────────────────────────────────────────────
// Holidays
// ─────────────────────────────────────────────────────────────────────────────

export async function dbAddHoliday(userId: string, year: number, holiday: Holiday): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('escala_holidays').insert({
    id: holiday.id,
    user_id: userId,
    year,
    date: holiday.date,
    name: holiday.name,
  })
  if (error) throw error
}

export async function dbAddHolidays(userId: string, year: number, holidays: Holiday[]): Promise<void> {
  if (holidays.length === 0) return
  const supabase = createClient()
  const { error } = await supabase.from('escala_holidays').insert(
    holidays.map((h) => ({ id: h.id, user_id: userId, year, date: h.date, name: h.name }))
  )
  if (error) throw error
}

export async function dbUpdateHoliday(
  userId: string,
  id: string,
  data: Partial<Omit<Holiday, 'id'>>
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('escala_holidays')
    .update(data)
    .eq('id', id)
    .eq('user_id', userId)
  if (error) throw error
}

export async function dbRemoveHoliday(userId: string, id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('escala_holidays')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)
  if (error) throw error
}

export async function dbSetHolidays(userId: string, year: number, holidays: Holiday[]): Promise<void> {
  const supabase = createClient()
  // Delete all for this year, then insert new ones
  const { error: delError } = await supabase
    .from('escala_holidays')
    .delete()
    .eq('user_id', userId)
    .eq('year', year)
  if (delError) throw delError

  if (holidays.length > 0) {
    const { error: insError } = await supabase.from('escala_holidays').insert(
      holidays.map((h) => ({ id: h.id, user_id: userId, year, date: h.date, name: h.name }))
    )
    if (insError) throw insError
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Schedules + Entries
// ─────────────────────────────────────────────────────────────────────────────

export async function dbSetSchedule(userId: string, year: number, schedule: Schedule): Promise<void> {
  const supabase = createClient()

  // Upsert schedule metadata
  const { error: schedErr } = await supabase
    .from('escala_schedules')
    .upsert({ user_id: userId, year, vendors_per_day: schedule.vendorsPerDay, updated_at: new Date().toISOString() })
  if (schedErr) throw schedErr

  // Delete all entries for this year, then re-insert
  const { error: delErr } = await supabase
    .from('escala_entries')
    .delete()
    .eq('user_id', userId)
    .eq('year', year)
  if (delErr) throw delErr

  if (schedule.entries.length > 0) {
    const { error: insErr } = await supabase.from('escala_entries').insert(
      schedule.entries.map((e) => ({
        id: e.id,
        user_id: userId,
        year,
        date: e.date,
        type: e.type,
        vendor_ids: e.vendorIds,
        closed: e.closed,
        locked: e.locked ?? false,
        note: e.note ?? null,
      }))
    )
    if (insErr) throw insErr
  }
}

export async function dbUpdateEntry(
  userId: string,
  entryId: string,
  data: Partial<Omit<ScheduleEntry, 'id'>>
): Promise<void> {
  const supabase = createClient()
  const payload: Record<string, unknown> = {}
  if (data.vendorIds !== undefined) payload.vendor_ids = data.vendorIds
  if (data.closed !== undefined) payload.closed = data.closed
  if (data.locked !== undefined) payload.locked = data.locked
  if (data.note !== undefined) payload.note = data.note ?? null
  if (data.type !== undefined) payload.type = data.type
  if (data.date !== undefined) payload.date = data.date

  const { error } = await supabase
    .from('escala_entries')
    .update(payload)
    .eq('id', entryId)
    .eq('user_id', userId)
  if (error) throw error
}

export async function dbSetEntriesLocked(
  userId: string,
  entryIds: string[],
  locked: boolean
): Promise<void> {
  if (entryIds.length === 0) return
  const supabase = createClient()
  const { error } = await supabase
    .from('escala_entries')
    .update({ locked })
    .in('id', entryIds)
    .eq('user_id', userId)
  if (error) throw error
}

export async function dbClearUnlockedVendors(userId: string, year: number): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('escala_entries')
    .update({ vendor_ids: [] })
    .eq('user_id', userId)
    .eq('year', year)
    .eq('locked', false)
  if (error) throw error
}

export async function dbRemoveSchedule(userId: string, year: number): Promise<void> {
  const supabase = createClient()
  const [r1, r2] = await Promise.all([
    supabase.from('escala_schedules').delete().eq('user_id', userId).eq('year', year),
    supabase.from('escala_entries').delete().eq('user_id', userId).eq('year', year),
  ])
  if (r1.error) throw r1.error
  if (r2.error) throw r2.error
}
