'use client'

import { useState } from 'react'
import { ScheduleEntry, Vendor } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EntryEditDialog } from '@/components/entry-edit-dialog'
import { Fragment } from 'react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { Lock, LockOpen, Pencil } from 'lucide-react'
import { useStore } from '@/lib/store'

type Props = {
  entries: ScheduleEntry[]
  vendors: Vendor[]
  year: number
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

export function ScheduleTable({ entries, vendors, year }: Props) {
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
          return (
            <div key={monthLabel}>
              <div className="sticky top-0 z-10 bg-primary px-3 py-2 mb-2 rounded-md flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-primary-foreground">
                  {monthLabel}
                </p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-primary-foreground hover:bg-primary/80 hover:text-primary-foreground"
                  title={allLocked ? 'Destravar mês' : 'Travar mês'}
                  onClick={() =>
                    setEntriesLocked(year, monthEntries.map((e) => e.id), !allLocked)
                  }
                >
                  {allLocked ? <Lock className="h-3.5 w-3.5" /> : <LockOpen className="h-3.5 w-3.5" />}
                </Button>
              </div>
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
                        !entry.closed && entry.type === 'holiday' && entry.locked && 'bg-red-50 border-amber-300',
                        !entry.closed && entry.type === 'holiday' && !entry.locked && 'bg-red-50 border-red-100',
                        !entry.closed && entry.type !== 'holiday' && entry.locked && 'bg-amber-50/50 border-amber-300',
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          {entry.locked && !entry.closed && (
                            <Lock className="h-3 w-3 text-amber-500 flex-shrink-0" />
                          )}
                          <div>
                            <p className="text-sm font-medium">{dateLabel}</p>
                            <p className="text-xs text-muted-foreground">{dayLabel}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Badge
                            variant={entry.type === 'holiday' ? 'destructive' : 'secondary'}
                          >
                            {entry.type === 'holiday' ? 'Feriado' : 'Dom'}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                              'h-6 w-6',
                              entry.locked ? 'text-amber-500' : 'text-muted-foreground'
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
          )
        })}
      </div>

      {/* Desktop: table */}
      <div className="hidden md:block overflow-x-auto" id="schedule-export">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left px-4 py-2.5 font-medium">Data</th>
              <th className="text-left px-4 py-2.5 font-medium">Dia</th>
              <th className="text-left px-4 py-2.5 font-medium">Tipo</th>
              <th className="text-left px-4 py-2.5 font-medium">Vendedores</th>
              <th className="text-left px-4 py-2.5 font-medium">Obs</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {groups.map(({ monthLabel, entries: monthEntries }) => {
              const allLocked = monthEntries.every((e) => e.locked)
              return (
                <Fragment key={monthLabel}>
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-2.5 bg-primary text-xs font-bold uppercase tracking-wider text-primary-foreground"
                    >
                      <div className="flex items-center justify-between">
                        <span>{monthLabel}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-primary-foreground hover:bg-primary/80 hover:text-primary-foreground"
                          title={allLocked ? 'Destravar mês' : 'Travar mês'}
                          onClick={() =>
                            setEntriesLocked(year, monthEntries.map((e) => e.id), !allLocked)
                          }
                        >
                          {allLocked
                            ? <Lock className="h-3.5 w-3.5" />
                            : <LockOpen className="h-3.5 w-3.5" />
                          }
                        </Button>
                      </div>
                    </td>
                  </tr>
                  {monthEntries.map((entry) => {
                    const date = parseISO(entry.date)
                    const dayLabel = capitalizeFirst(format(date, 'EEEE', { locale: ptBR }))
                    const dateLabel = format(date, 'dd/MM/yyyy')
                    const vendorNames = entry.vendorIds.map((id) => getVendorName(id, vendors))

                    return (
                      <tr
                        key={entry.id}
                        className={cn(
                          'border-b transition-colors hover:bg-muted/30 cursor-pointer',
                          entry.closed && 'opacity-50 bg-muted/20',
                          !entry.closed && entry.type === 'holiday' && entry.locked && 'bg-red-50',
                          !entry.closed && entry.type === 'holiday' && !entry.locked && 'bg-red-50',
                          !entry.closed && entry.type !== 'holiday' && entry.locked && 'bg-amber-50/60',
                        )}
                        onClick={() => setEditing(entry)}
                      >
                        <td className="px-4 py-2.5 font-medium">
                          <div className="flex items-center gap-1.5">
                            {entry.locked && !entry.closed && (
                              <Lock className="h-3 w-3 text-amber-500 flex-shrink-0" />
                            )}
                            {dateLabel}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground">{dayLabel}</td>
                        <td className="px-4 py-2.5">
                          <Badge variant={entry.type === 'holiday' ? 'destructive' : 'secondary'}>
                            {entry.type === 'holiday' ? 'Feriado' : 'Domingo'}
                          </Badge>
                        </td>
                        <td className="px-4 py-2.5">
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
                        </td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground italic">
                          {entry.note}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className={cn(
                                'h-8 w-8',
                                entry.locked ? 'text-amber-500' : 'text-muted-foreground'
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
                        </td>
                      </tr>
                    )
                  })}
                </Fragment>
              )
            })}
          </tbody>
        </table>
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
