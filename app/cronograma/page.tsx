'use client'

import { useState, useMemo } from 'react'
import { useStore } from '@/lib/store'
import { ScheduleTable } from '@/components/schedule-table'
import { GenerateDialog } from '@/components/generate-dialog'
import { ExportButton } from '@/components/export-button'
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
import { Eraser } from 'lucide-react'
import { toast } from 'sonner'
import { parseISO } from 'date-fns'

const currentYear = new Date().getFullYear()
const years = [currentYear - 1, currentYear, currentYear + 1]

const monthNames = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

export default function CronogramaPage() {
  const [year, setYear] = useState(currentYear)
  const [month, setMonth] = useState<string>('all')
  const [clearConfirm, setClearConfirm] = useState(false)
  const { schedules, vendors, clearUnlockedVendors } = useStore()

  const schedule = schedules[year]

  const filteredEntries = useMemo(() => {
    if (!schedule) return []
    if (month === 'all') return schedule.entries
    const m = Number(month)
    return schedule.entries.filter((e) => parseISO(e.date).getMonth() === m)
  }, [schedule, month])

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Cronograma</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Domingos e feriados escalados por vendedor
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-24 min-h-[44px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-48 min-h-[44px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os meses</SelectItem>
              {monthNames.map((name, i) => (
                <SelectItem key={i} value={String(i)}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <ExportButton year={year} />
          {schedule && (
            <Button
              variant="outline"
              className="gap-2 min-h-[44px] text-destructive hover:text-destructive"
              onClick={() => setClearConfirm(true)}
            >
              <Eraser className="h-4 w-4" />
              <span className="hidden sm:inline">Limpar não travados</span>
            </Button>
          )}
          <GenerateDialog defaultYear={year} />
        </div>
      </div>

      {/* Content */}
      {!schedule ? (
        <div className="border rounded-xl p-10 text-center space-y-4">
          <p className="text-muted-foreground">
            Nenhum cronograma gerado para {year}. Clique em "Gerar Cronograma" para começar.
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
            <ScheduleTable entries={filteredEntries} vendors={vendors} year={year} />
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
