'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '@/lib/store'
import { ScheduleTable } from '@/components/schedule-table'
import { GenerateDialog } from '@/components/generate-dialog'
import { ExportButton } from '@/components/export-button'
import { ActiveUserBanner } from '@/components/active-user-banner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { ChevronsDownUp, ChevronsUpDown, Eraser } from 'lucide-react'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const currentYear = new Date().getFullYear()
const years = [currentYear - 1, currentYear, currentYear + 1]

const monthNames = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

function capitalizeFirst(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export default function CronogramaPage() {
  const [year, setYear] = useState(currentYear)
  const [month, setMonth] = useState<string>('all')
  const [clearConfirm, setClearConfirm] = useState(false)
  const [showFloatingActions, setShowFloatingActions] = useState(false)
  const [collapsedMonths, setCollapsedMonths] = useState<Set<string>>(new Set())
  const headerRef = useRef<HTMLDivElement | null>(null)
  const { schedules, vendors, clearUnlockedVendors } = useStore()

  const schedule = schedules[year]

  const filteredEntries = useMemo(() => {
    if (!schedule) return []
    if (month === 'all') return schedule.entries
    const m = Number(month)
    return schedule.entries.filter((e) => parseISO(e.date).getMonth() === m)
  }, [schedule, month])

  const visibleMonthLabels = useMemo(() => {
    const labels: string[] = []
    let current: string | null = null
    for (const entry of filteredEntries) {
      const date = parseISO(entry.date)
      const label = capitalizeFirst(format(date, 'MMMM yyyy', { locale: ptBR }))
      if (label !== current) {
        labels.push(label)
        current = label
      }
    }
    return labels
  }, [filteredEntries])

  const areAllMonthsCollapsed =
    visibleMonthLabels.length > 0 && visibleMonthLabels.every((label) => collapsedMonths.has(label))

  function toggleMonth(monthLabel: string) {
    setCollapsedMonths((prev) => {
      const next = new Set(prev)
      if (next.has(monthLabel)) next.delete(monthLabel)
      else next.add(monthLabel)
      return next
    })
  }

  function toggleAllMonths() {
    setCollapsedMonths((prev) => {
      const next = new Set(prev)
      if (areAllMonthsCollapsed) {
        for (const label of visibleMonthLabels) next.delete(label)
      } else {
        for (const label of visibleMonthLabels) next.add(label)
      }
      return next
    })
  }

  useEffect(() => {
    const header = headerRef.current
    if (!header) return

    const observer = new IntersectionObserver(
      ([entry]) => setShowFloatingActions(!entry.isIntersecting),
      { threshold: 0 }
    )
    observer.observe(header)

    return () => observer.disconnect()
  }, [])

  return (
    <div className="w-full p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <ActiveUserBanner />

      <div
        className={cn(
          'fixed left-3 right-3 top-3 z-40 flex justify-end gap-2 transition-all duration-200 ease-out md:left-[15rem] md:right-6',
          showFloatingActions
            ? 'translate-y-0 opacity-100'
            : 'pointer-events-none -translate-y-3 opacity-0'
        )}
      >
        {schedule && visibleMonthLabels.length > 0 && (
          <Button
            variant="outline"
            className="gap-2 min-h-[42px] rounded-full bg-background/95 px-3 shadow-lg backdrop-blur sm:px-4"
            onClick={toggleAllMonths}
            title={areAllMonthsCollapsed ? 'Expandir meses' : 'Recolher meses'}
          >
            {areAllMonthsCollapsed ? (
              <ChevronsUpDown className="h-4 w-4" />
            ) : (
              <ChevronsDownUp className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">
              {areAllMonthsCollapsed ? 'Expandir meses' : 'Recolher meses'}
            </span>
          </Button>
        )}
        <ExportButton
          year={year}
          triggerClassName="min-h-[42px] rounded-full bg-background/95 px-3 shadow-lg backdrop-blur sm:px-4 [&>span]:hidden sm:[&>span]:inline"
        />
        {schedule && (
          <Button
            variant="outline"
            className="gap-2 min-h-[42px] rounded-full bg-background/95 px-4 text-destructive shadow-lg backdrop-blur hover:text-destructive"
            onClick={() => setClearConfirm(true)}
          >
            <Eraser className="h-4 w-4" />
            <span className="hidden sm:inline">Limpar não travados</span>
            <span className="sm:hidden">Limpar</span>
          </Button>
        )}
      </div>

      <div
        className={cn(
          'fixed bottom-12 right-3 z-40 transition-all duration-200 ease-out md:bottom-1 md:right-6',
          showFloatingActions
            ? 'translate-y-0 opacity-100'
            : 'pointer-events-none translate-y-3 opacity-0'
        )}
      >
        <GenerateDialog defaultYear={year} triggerClassName="min-h-[46px] rounded-full px-5 shadow-lg backdrop-blur md:min-h-[40px] md:px-4" />
      </div>

      {/* Header */}
      <div ref={headerRef} className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Cronograma</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Domingos e feriados escalados por vendedor
          </p>
        </div>
        <div className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.4fr)] gap-2 sm:flex sm:flex-wrap sm:items-center">
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-full min-h-[44px] sm:w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-full min-h-[44px] sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os meses</SelectItem>
              {monthNames.map((name, i) => (
                <SelectItem key={i} value={String(i)}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <ExportButton year={year} triggerClassName="w-full sm:w-auto" />
          {schedule && (
            <Button
              variant="outline"
              className="gap-2 min-h-[44px] w-full text-destructive hover:text-destructive sm:w-auto"
              onClick={() => setClearConfirm(true)}
              title="Limpar não travados"
            >
              <Eraser className="h-4 w-4" />
              <span className="hidden sm:inline">Limpar não travados</span>
            </Button>
          )}
          <GenerateDialog defaultYear={year} triggerClassName="col-span-2 w-full sm:w-auto" />
        </div>
      </div>

      {/* Content */}
      {!schedule ? (
        <div className="border rounded-xl p-10 text-center space-y-4">
          <p className="text-muted-foreground">
            Nenhum cronograma gerado para {year}. Clique em &quot;Gerar Cronograma&quot; para começar.
          </p>
          <GenerateDialog defaultYear={year} />
        </div>
      ) : (
        <div className="border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {filteredEntries.length} data{filteredEntries.length !== 1 ? 's' : ''} •{' '}
              {filteredEntries.filter((e) => e.type === 'sunday').length} domingos •{' '}
              {filteredEntries.filter((e) => e.type === 'holiday').length} feriados
            </p>
          </div>
          <div className="p-3 md:p-0">
            <ScheduleTable
              entries={filteredEntries}
              vendors={vendors}
              year={year}
              collapsedMonths={collapsedMonths}
              onToggleMonth={toggleMonth}
            />
          </div>
        </div>
      )}

      <Dialog open={clearConfirm} onOpenChange={setClearConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Limpar vendedores não travados</DialogTitle>
            <DialogDescription>
              Isso vai remover os vendedores de todas as datas de {year} que não estão
              travadas. Datas travadas não serão afetadas. Deseja continuar?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClearConfirm(false)} className="min-h-[44px]">
              Cancelar
            </Button>
            <Button
              variant="destructive"
              className="min-h-[44px]"
              onClick={async () => {
                await clearUnlockedVendors(year)
                setClearConfirm(false)
                toast.success('Vendedores removidos das datas não travadas.')
              }}
            >
              Limpar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
