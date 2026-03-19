import {
  eachDayOfInterval,
  startOfYear,
  endOfYear,
  isSunday,
  format,
} from 'date-fns'
import { nanoid } from 'nanoid'
import { Vendor, Holiday, Schedule, ScheduleEntry } from '@/types'

export function getSundays(year: number): string[] {
  const days = eachDayOfInterval({
    start: startOfYear(new Date(year, 0, 1)),
    end: endOfYear(new Date(year, 0, 1)),
  })
  return days.filter((d) => isSunday(d)).map((d) => format(d, 'yyyy-MM-dd'))
}

export type ExpectedDate = {
  date: string
  type: 'sunday' | 'holiday'
  note?: string
}

/**
 * Compute the expected set of schedule dates for a year given its holidays.
 * Uses the same logic as generateSchedule to determine which dates should exist.
 */
export function computeExpectedDates(year: number, holidays: Holiday[]): ExpectedDate[] {
  const realHolidays = holidays.filter((h) => h.type !== 'special')
  const specialDates = holidays.filter((h) => h.type === 'special')
  const holidayDateMap = new Map(realHolidays.map((h) => [h.date, h]))
  const allSundays = getSundays(year)

  const items: ExpectedDate[] = []

  for (const date of allSundays) {
    if (!holidayDateMap.has(date)) {
      items.push({ date, type: 'sunday' })
    }
  }
  for (const h of realHolidays) {
    items.push({ date: h.date, type: 'holiday', note: h.name })
  }
  for (const s of specialDates) {
    if (!holidayDateMap.has(s.date)) {
      items.push({ date: s.date, type: 'sunday', note: s.name })
    }
  }

  items.sort((a, b) => a.date.localeCompare(b.date))

  // Deduplicate by date
  const seen = new Set<string>()
  return items.filter((item) => {
    if (seen.has(item.date)) return false
    seen.add(item.date)
    return true
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
  const lockedMap = new Map(lockedEntries.map((e) => [e.date, e]))

  // Build partialMap: non-locked, non-closed entries with 1+ vendors but fewer than vendorsPerDay
  const activeIds = new Set(activeVendors.map((v) => v.id))
  const partialMap = new Map<string, string[]>()
  if (existingSchedule) {
    for (const entry of existingSchedule.entries) {
      if (entry.locked || entry.closed || entry.vendorIds.length === 0) continue
      const validIds = entry.vendorIds.filter((id) => activeIds.has(id))
      if (validIds.length > 0 && validIds.length < vendorsPerDay) {
        partialMap.set(entry.date, validIds)
      }
    }
  }

  // Build initial counts from locked entries (separately per type)
  const sundayCounts: Record<string, number> = {}
  const holidayCounts: Record<string, number> = {}
  for (const v of activeVendors) {
    sundayCounts[v.id] = 0
    holidayCounts[v.id] = 0
  }
  for (const entry of lockedEntries) {
    if (entry.closed) continue
    for (const vid of entry.vendorIds) {
      if (entry.type === 'sunday') {
        if (sundayCounts[vid] !== undefined) sundayCounts[vid]++
      } else {
        if (holidayCounts[vid] !== undefined) holidayCounts[vid]++
      }
    }
  }

  // Separate real holidays from special dates (which count as Sundays)
  const realHolidays = holidays.filter((h) => h.type !== 'special')
  const specialDates = holidays.filter((h) => h.type === 'special')
  const holidayDateMap = new Map(realHolidays.map((h) => [h.date, h]))
  const allSundays = getSundays(year)

  // Build unified chronological list of all scheduled dates.
  // A holiday that falls on a Sunday is counted only as a holiday.
  // Special dates count as Sundays (1 point instead of 2).
  type DateItem = {
    date: string
    type: 'sunday' | 'holiday'
    note?: string
    locked: boolean
  }
  const allItems: DateItem[] = []

  for (const date of allSundays) {
    if (!holidayDateMap.has(date)) {
      allItems.push({ date, type: 'sunday', locked: lockedDates.has(date) })
    }
  }
  for (const h of realHolidays) {
    allItems.push({ date: h.date, type: 'holiday', note: h.name, locked: lockedDates.has(h.date) })
  }
  // Special dates act as Sundays. If a special date falls on a real holiday,
  // the holiday takes precedence. Duplicates with real Sundays are handled by dedup.
  for (const s of specialDates) {
    if (!holidayDateMap.has(s.date)) {
      allItems.push({ date: s.date, type: 'sunday', note: s.name, locked: lockedDates.has(s.date) })
    }
  }
  allItems.sort((a, b) => a.date.localeCompare(b.date))

  // Deduplicate by date: if the same date appears more than once (e.g. due to
  // duplicate holiday entries), keep only the first occurrence to avoid pushing
  // the same locked entry twice and causing a primary-key violation on insert.
  const seenDates = new Set<string>()
  const uniqueItems = allItems.filter((item) => {
    if (seenDates.has(item.date)) return false
    seenDates.add(item.date)
    return true
  })

  // Process all dates chronologically.
  // Vendors from the previous date are moved to the back of the candidate list
  // so the same vendor is never placed on two consecutive dates.
  // If all available vendors were in the previous date (e.g. very few vendors),
  // the constraint is relaxed gracefully by falling through to the full list.
  let lastAssigned = new Set<string>()
  const entries: ScheduleEntry[] = []

  for (const item of uniqueItems) {
    if (item.locked) {
      const lockedEntry = lockedMap.get(item.date)!
      // Update last-assigned from locked entries so that generated entries
      // following them also respect the no-consecutive constraint.
      lastAssigned = lockedEntry.closed ? new Set() : new Set(lockedEntry.vendorIds)
      entries.push(lockedEntry)
      continue
    }

    const counts = item.type === 'sunday' ? sundayCounts : holidayCounts

    const byCount = (a: Vendor, b: Vendor) => {
      const diff = counts[a.id] - counts[b.id]
      return diff !== 0 ? diff : a.name.localeCompare(b.name)
    }

    const pinnedIds = partialMap.get(item.date)
    let chosen: string[]

    if (pinnedIds) {
      // Pin existing vendors and auto-fill remaining slots
      const remaining = vendorsPerDay - pinnedIds.length
      const pinnedSet = new Set(pinnedIds)
      const candidates = activeVendors.filter((v) => !pinnedSet.has(v.id))
      const preferred = candidates.filter((v) => !lastAssigned.has(v.id))
      const fallback = candidates.filter((v) => lastAssigned.has(v.id))
      const autoChosen = [...preferred.sort(byCount), ...fallback.sort(byCount)]
        .slice(0, remaining)
        .map((v) => v.id)
      chosen = [...pinnedIds, ...autoChosen]
    } else {
      // Partition vendors: prefer those NOT in the previous date.
      const preferred = activeVendors.filter((v) => !lastAssigned.has(v.id))
      const fallback = activeVendors.filter((v) => lastAssigned.has(v.id))
      const sorted = [...preferred.sort(byCount), ...fallback.sort(byCount)]
      chosen = sorted.slice(0, vendorsPerDay).map((v) => v.id)
    }

    for (const id of chosen) counts[id]++
    lastAssigned = new Set(chosen)

    entries.push({
      id: nanoid(),
      date: item.date,
      type: item.type,
      vendorIds: chosen,
      closed: false,
      note: item.note,
    })
  }

  return { year, vendorsPerDay, entries }
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
