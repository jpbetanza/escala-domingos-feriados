import {
  eachDayOfInterval,
  startOfYear,
  endOfYear,
  isSunday,
  format,
  parseISO,
} from 'date-fns'
import { nanoid } from 'nanoid'
import { Vendor, Holiday, Schedule, ScheduleEntry } from '@/types'

function getSundays(year: number): string[] {
  const days = eachDayOfInterval({
    start: startOfYear(new Date(year, 0, 1)),
    end: endOfYear(new Date(year, 0, 1)),
  })
  return days.filter((d) => isSunday(d)).map((d) => format(d, 'yyyy-MM-dd'))
}

function assignDates(
  dates: { date: string; type: 'sunday' | 'holiday'; closed: boolean; note?: string }[],
  vendors: Vendor[],
  vendorsPerDay: 2 | 3,
  initialCounts?: Record<string, number>
): ScheduleEntry[] {
  const counts: Record<string, number> = {}
  for (const v of vendors) counts[v.id] = initialCounts?.[v.id] ?? 0

  return dates.map(({ date, type, closed, note }) => {
    if (closed) {
      return { id: nanoid(), date, type, vendorIds: [], closed: true, note }
    }

    // Sort vendors by count ascending, then by name for stability
    const sorted = [...vendors].sort((a, b) => {
      const diff = counts[a.id] - counts[b.id]
      if (diff !== 0) return diff
      return a.name.localeCompare(b.name)
    })

    const chosen = sorted.slice(0, vendorsPerDay).map((v) => v.id)
    for (const id of chosen) counts[id]++

    return { id: nanoid(), date, type, vendorIds: chosen, closed: false, note }
  })
}

export function generateSchedule(
  year: number,
  vendors: Vendor[],
  holidays: Holiday[],
  vendorsPerDay: 2 | 3,
  existingSchedule?: Schedule
): Schedule {
  const activeVendors = vendors.filter((v) => v.active)
  if (activeVendors.length === 0) {
    return { year, vendorsPerDay, entries: [] }
  }

  // Extract locked entries from existing schedule
  const lockedEntries = existingSchedule?.entries.filter((e) => e.locked) ?? []
  const lockedDates = new Set(lockedEntries.map((e) => e.date))

  // Build initial counts from locked entries (separately per type)
  const lockedSundayCounts: Record<string, number> = {}
  const lockedHolidayCounts: Record<string, number> = {}
  for (const v of activeVendors) {
    lockedSundayCounts[v.id] = 0
    lockedHolidayCounts[v.id] = 0
  }
  for (const entry of lockedEntries) {
    if (entry.closed) continue
    for (const vid of entry.vendorIds) {
      if (entry.type === 'sunday') {
        if (lockedSundayCounts[vid] !== undefined) lockedSundayCounts[vid]++
      } else {
        if (lockedHolidayCounts[vid] !== undefined) lockedHolidayCounts[vid]++
      }
    }
  }

  // Build holiday date set for quick lookup
  const holidayDateMap = new Map(holidays.map((h) => [h.date, h]))

  // Get all sundays
  const allSundays = getSundays(year)

  // Separate: sundays that are NOT holidays, and holidays (which may fall on sundays)
  // Exclude locked dates from the pools to generate
  const pureSundays = allSundays.filter((d) => !holidayDateMap.has(d) && !lockedDates.has(d))

  // Sort holidays by date, excluding locked
  const sortedHolidays = [...holidays]
    .filter((h) => !lockedDates.has(h.date))
    .sort((a, b) => a.date.localeCompare(b.date))

  // Assign sundays independently, seeding counts from locked entries
  const sundayDates = pureSundays.map((date) => ({
    date,
    type: 'sunday' as const,
    closed: false,
  }))
  const sundayEntries = assignDates(sundayDates, activeVendors, vendorsPerDay, lockedSundayCounts)

  // Assign holidays independently, seeding counts from locked entries
  const holidayDates = sortedHolidays.map((h) => ({
    date: h.date,
    type: 'holiday' as const,
    closed: false,
    note: h.name,
  }))
  const holidayEntries = assignDates(holidayDates, activeVendors, vendorsPerDay, lockedHolidayCounts)

  // Merge locked entries with newly generated ones and sort by date
  const allEntries = [...lockedEntries, ...sundayEntries, ...holidayEntries].sort((a, b) =>
    a.date.localeCompare(b.date)
  )

  return { year, vendorsPerDay, entries: allEntries }
}

export type VendorStats = {
  vendorId: string
  sundayCount: number
  holidayCount: number
  totalPoints: number
}

export function computeStats(schedule: Schedule | undefined): VendorStats[] {
  if (!schedule) return []

  const stats: Record<string, VendorStats> = {}

  for (const entry of schedule.entries) {
    if (entry.closed) continue
    for (const vid of entry.vendorIds) {
      if (!stats[vid]) {
        stats[vid] = { vendorId: vid, sundayCount: 0, holidayCount: 0, totalPoints: 0 }
      }
      if (entry.type === 'sunday') {
        stats[vid].sundayCount++
        stats[vid].totalPoints += 1
      } else {
        stats[vid].holidayCount++
        stats[vid].totalPoints += 2
      }
    }
  }

  return Object.values(stats)
}
