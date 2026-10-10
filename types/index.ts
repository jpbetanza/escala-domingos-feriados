export type Vendor = {
  id: string
  name: string
  active: boolean
}

export type Holiday = {
  id: string
  date: string // "YYYY-MM-DD"
  name: string
  type: 'holiday' | 'special'
}

export type ScheduleEntry = {
  id: string
  date: string // "YYYY-MM-DD"
  type: 'sunday' | 'holiday'
  vendorIds: string[]
  closed: boolean
  locked?: boolean
  note?: string
  vendorsCount?: number // overrides Schedule.vendorsPerDay for this date only
}

export type Schedule = {
  year: number
  vendorsPerDay: 2 | 3
  entries: ScheduleEntry[]
}

export type ManageableUser = {
  userId: string
  email: string | null
  avatarUrl: string | null
}

export type AppState = {
  // Data
  vendors: Vendor[]
  holidays: Record<number, Holiday[]>
  schedules: Record<number, Schedule>
  // Auth state
  sessionUserId: string | null
  sessionUserEmail: string | null
  sessionUserAvatar: string | null
  activeUserId: string | null
  activeUserEmail: string | null
  activeUserAvatar: string | null
  manageableUsers: ManageableUser[]
  isAdmin: boolean
  isLoadingData: boolean
  // Auth actions
  setUser: (userId: string, email: string | null, avatar: string | null) => void
  loadManageableUsers: () => Promise<void>
  loadUserData: (userId: string) => Promise<void>
  switchActiveUser: (userId: string) => Promise<void>
  seedDefaultVendors: (userId: string) => Promise<void>
  resetStore: () => void
  // Data actions
  addVendor: (name: string) => Promise<void>
  updateVendor: (id: string, data: Partial<Omit<Vendor, 'id'>>) => Promise<void>
  removeVendor: (id: string) => Promise<void>
  addHoliday: (year: number, holiday: Omit<Holiday, 'id'>) => Promise<void>
  addHolidays: (year: number, holidays: Omit<Holiday, 'id'>[]) => Promise<void>
  updateHoliday: (year: number, id: string, data: Partial<Omit<Holiday, 'id'>>) => Promise<void>
  removeHoliday: (year: number, id: string) => Promise<void>
  setHolidays: (year: number, holidays: Omit<Holiday, 'id'>[]) => Promise<void>
  setSchedule: (year: number, schedule: Schedule) => Promise<void>
  updateEntry: (year: number, entryId: string, data: Partial<Omit<ScheduleEntry, 'id'>>) => Promise<void>
  setEntriesLocked: (year: number, entryIds: string[], locked: boolean) => Promise<void>
  clearUnlockedVendors: (year: number) => Promise<void>
  removeSchedule: (year: number) => Promise<void>
}
