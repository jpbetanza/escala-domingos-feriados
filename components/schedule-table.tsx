'use client'

import { useState } from 'react'
import { ScheduleEntry, Vendor } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EntryEditDialog } from '@/components/entry-edit-dialog'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { ChevronDown, ChevronRight, Lock, LockOpen, Pencil, Users } from 'lucide-react'
import { useStore } from '@/lib/store'

type Props = {
  entries: ScheduleEntry[]
  vendors: Vendor[]
  year: number
  collapsedMonths: Set<string>
  onToggleMonth: (monthLabel: string) => void
}

function getVendorName(id: string, vendors: Vendor[]): string {
  return vendors.find((v) => v.id === id)?.name ?? id
}

function capitalizeFirst(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// Group entries by month, preserving order
function groupByMonth(entries: ScheduleEntry[]): { monthLabel: string; entries: ScheduleEntry[] }[] {
  const groups: { monthLabel: string; entries: ScheduleEntry[] }[] = []
  let current: { monthLabel: string; entries: ScheduleEntry[] } | null = null

  for (const entry of entries) {
    const date = parseISO(entry.date)
    const monthLabel = capitalizeFirst(format(date, 'MMMM yyyy', { locale: ptBR }))
    if (!current || current.monthLabel !== monthLabel) {
      current = { monthLabel, entries: [] }
      groups.push(current)
    }
    current.entries.push(entry)
  }

  return groups
}

export function ScheduleTable({ entries, vendors, year, collapsedMonths, onToggleMonth }: Props) {
  const [editing, setEditing] = useState<ScheduleEntry | null>(null)
  const { updateEntry, setEntriesLocked } = useStore()

  if (entries.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Nenhuma data encontrada para este período.
      </div>
    )
  }

  const groups = groupByMonth(entries)

  return (
    <>
      {/* Mobile: card list */}
      <div className="md:hidden space-y-6" id="schedule-export">
        {groups.map(({ monthLabel, entries: monthEntries }) => {
          const allLocked = monthEntries.every((e) => e.locked)
          const isCollapsed = collapsedMonths.has(monthLabel)
          return (
            <div key={monthLabel}>
              <div
                role="button"
                tabIndex={0}
                className="sticky top-0 z-10 w-full cursor-pointer bg-muted px-3 py-2 mb-2 rounded-md flex items-center justify-between text-left transition-colors hover:bg-muted/80"
                onClick={() => onToggleMonth(monthLabel)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onToggleMonth(monthLabel)
                  }
                }}
              >
                <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
                  {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  {monthLabel}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:bg-muted-foreground/10 hover:text-foreground"
                  title={allLocked ? 'Destravar mês' : 'Travar mês'}
                  onClick={(e) => {
                    e.stopPropagation()
                    setEntriesLocked(year, monthEntries.map((e) => e.id), !allLocked)
                  }}
                >
                  {allLocked ? <Lock className="h-3.5 w-3.5" /> : <LockOpen className="h-3.5 w-3.5" />}
                </Button>
              </div>
              <div
                className={cn(
                  'grid transition-[grid-template-rows,opacity] duration-200 ease-out',
                  isCollapsed ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100'
                )}
              >
                <div className="min-h-0 overflow-hidden">
                  <div className="space-y-2">
                    {monthEntries.map((entry) => {
                  const date = parseISO(entry.date)
                  const dayLabel = capitalizeFirst(format(date, 'EEEE', { locale: ptBR }))
                  const dateLabel = format(date, 'dd/MM/yyyy')
                  const vendorNames = entry.vendorIds.map((id) => getVendorName(id, vendors))

                  return (
                    <div
                      key={entry.id}
                      onClick={() => setEditing(entry)}
                      className={cn(
                        'border rounded-lg p-3 cursor-pointer hover:bg-muted/50 transition-colors',
                        entry.closed && 'opacity-50 bg-muted/30',
                        !entry.closed && entry.type === 'holiday' && entry.locked && 'bg-rose-50/70 border-amber-200',
                        !entry.closed && entry.type === 'holiday' && !entry.locked && 'bg-rose-50/70 border-rose-100',
                        !entry.closed && entry.type !== 'holiday' && entry.locked && 'bg-amber-50/40 border-amber-200',
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          {entry.locked && !entry.closed && (
                            <Lock className="h-3 w-3 text-amber-600/80 flex-shrink-0" />
                          )}
                          <div>
                            <p className="text-sm font-medium">{dateLabel}</p>
                            <p className="text-xs text-muted-foreground">{dayLabel}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <VendorsCountBadge entry={entry} />
                          <Badge
                            variant="secondary"
                            className={entry.type === 'holiday' ? 'bg-rose-100 text-rose-800' : undefined}
                          >
                            {entry.type === 'holiday' ? 'Feriado' : 'Dom'}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                              'h-6 w-6',
                              entry.locked ? 'text-amber-600/80' : 'text-muted-foreground'
                            )}
                            title={entry.locked ? 'Destravar data' : 'Travar data'}
                            onClick={(e) => {
                              e.stopPropagation()
                              updateEntry(year, entry.id, { locked: !entry.locked })
                            }}
                          >
                            {entry.locked
                              ? <Lock className="h-3.5 w-3.5" />
                              : <LockOpen className="h-3.5 w-3.5" />
                            }
                          </Button>
                        </div>
                      </div>
                      {entry.closed ? (
                        <p className="text-xs text-muted-foreground mt-2">Fechado</p>
                      ) : (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {vendorNames.map((name) => (
                            <span
                              key={name}
                              className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full"
                            >
                              {name}
                            </span>
                          ))}
                          {entry.note && (
                            <span className="text-xs text-muted-foreground italic">{entry.note}</span>
                          )}
                        </div>
                      )}
                    </div>
                  )
                    })}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Desktop: rounded rows */}
      <div className="hidden md:block p-3" id="schedule-export">
        <div className="grid grid-cols-[180px_160px_140px_minmax(220px,1fr)_minmax(160px,1fr)_96px] gap-3 px-4 py-2 text-sm font-medium text-muted-foreground">
          <span>Data</span>
          <span>Dia</span>
          <span>Tipo</span>
          <span>Vendedores</span>
          <span>Obs</span>
          <span></span>
        </div>
        <div className="space-y-3">
            {groups.map(({ monthLabel, entries: monthEntries }) => {
              const allLocked = monthEntries.every((e) => e.locked)
              const isCollapsed = collapsedMonths.has(monthLabel)
              return (
                <div key={monthLabel} className="space-y-2">
                  <div
                    role="button"
                    tabIndex={0}
                    className="w-full cursor-pointer rounded-md bg-muted px-4 py-2 text-left text-xs font-bold uppercase tracking-wider text-foreground flex items-center justify-between transition-colors hover:bg-muted/80"
                    onClick={() => onToggleMonth(monthLabel)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        onToggleMonth(monthLabel)
                      }
                    }}
                  >
                    <span className="flex items-center gap-2">
                      {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      {monthLabel}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:bg-muted-foreground/10 hover:text-foreground"
                      title={allLocked ? 'Destravar mês' : 'Travar mês'}
                      onClick={(e) => {
                        e.stopPropagation()
                        setEntriesLocked(year, monthEntries.map((e) => e.id), !allLocked)
                      }}
                    >
                      {allLocked
                        ? <Lock className="h-3.5 w-3.5" />
                        : <LockOpen className="h-3.5 w-3.5" />
                      }
                    </Button>
                  </div>
                  <div
                    className={cn(
                      'grid transition-[grid-template-rows,opacity] duration-200 ease-out',
                      isCollapsed ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100'
                    )}
                  >
                    <div className="min-h-0 overflow-hidden">
                      <div className="space-y-2">
                        {monthEntries.map((entry) => {
                    const date = parseISO(entry.date)
                    const dayLabel = capitalizeFirst(format(date, 'EEEE', { locale: ptBR }))
                    const dateLabel = format(date, 'dd/MM/yyyy')
                    const vendorNames = entry.vendorIds.map((id) => getVendorName(id, vendors))

                    return (
                      <div
                        key={entry.id}
                        className={cn(
                          'grid grid-cols-[180px_160px_140px_minmax(220px,1fr)_minmax(160px,1fr)_96px] gap-3 items-center rounded-lg border px-4 py-3 text-sm transition-colors hover:bg-muted/30 cursor-pointer',
                          entry.closed && 'opacity-50 bg-muted/20',
                          !entry.closed && entry.type === 'holiday' && entry.locked && 'bg-rose-50/70',
                          !entry.closed && entry.type === 'holiday' && !entry.locked && 'bg-rose-50/70',
                          !entry.closed && entry.type !== 'holiday' && entry.locked && 'bg-amber-50/40',
                        )}
                        onClick={() => setEditing(entry)}
                      >
                        <div className="font-medium">
                          <div className="flex items-center gap-1.5">
                            {entry.locked && !entry.closed && (
                              <Lock className="h-3 w-3 text-amber-600/80 flex-shrink-0" />
                            )}
                            {dateLabel}
                          </div>
                        </div>
                        <div className="text-muted-foreground">{dayLabel}</div>
                        <div className="flex flex-wrap items-center gap-1">
                          <Badge
                            variant="secondary"
                            className={entry.type === 'holiday' ? 'bg-rose-100 text-rose-800' : undefined}
                          >
                            {entry.type === 'holiday' ? 'Feriado' : 'Domingo'}
                          </Badge>
                          <VendorsCountBadge entry={entry} />
                        </div>
                        <div>
                          {entry.closed ? (
                            <span className="text-muted-foreground text-xs">Fechado</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {vendorNames.map((name) => (
                                <span
                                  key={name}
                                  className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full"
                                >
                                  {name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground italic truncate">
                          {entry.note}
                        </div>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                              'h-8 w-8',
                              entry.locked ? 'text-amber-600/80' : 'text-muted-foreground'
                            )}
                            title={entry.locked ? 'Destravar data' : 'Travar data'}
                            onClick={(e) => {
                              e.stopPropagation()
                              updateEntry(year, entry.id, { locked: !entry.locked })
                            }}
                          >
                            {entry.locked
                              ? <Lock className="h-3.5 w-3.5" />
                              : <LockOpen className="h-3.5 w-3.5" />
                            }
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation()
                              setEditing(entry)
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    )
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
        </div>
      </div>

      {editing && (
        <EntryEditDialog
          entry={editing}
          year={year}
          vendors={vendors}
          open={true}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  )
}

function VendorsCountBadge({ entry }: { entry: ScheduleEntry }) {
  if (entry.closed || entry.vendorsCount === undefined) return null
  return (
    <span
      title="Quantidade de vendedores ajustada só neste dia"
      className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-900 dark:bg-blue-950/60 dark:text-blue-200"
    >
      <Users className="h-3 w-3" aria-hidden="true" />
      {entry.vendorsCount} neste dia
    </span>
  )
}
