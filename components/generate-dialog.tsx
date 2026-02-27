'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Wand2 } from 'lucide-react'
import { useStore } from '@/lib/store'
import { generateSchedule } from '@/lib/scheduler'
import { toast } from 'sonner'

type Props = {
  defaultYear?: number
}

const currentYear = new Date().getFullYear()
const years = [currentYear - 1, currentYear, currentYear + 1]

export function GenerateDialog({ defaultYear = currentYear }: Props) {
  const [open, setOpen] = useState(false)
  const [year, setYear] = useState(String(defaultYear))
  const [vendorsPerDay, setVendorsPerDay] = useState<'2' | '3'>('2')
  const [loading, setLoading] = useState(false)

  const { vendors, holidays, schedules, setSchedule } = useStore()

  const existing = schedules[Number(year)]
  const lockedCount = existing?.entries.filter((e) => e.locked).length ?? 0

  async function handleGenerate() {
    setLoading(true)
    try {
      const y = Number(year)
      const vpd = Number(vendorsPerDay) as 2 | 3
      const yearHolidays = holidays[y] ?? []
      const schedule = generateSchedule(y, vendors, yearHolidays, vpd, existing ?? undefined)
      await setSchedule(y, schedule)
      toast.success(`Cronograma de ${y} gerado com sucesso!`, {
        description: `${schedule.entries.length} datas escaladas.`,
      })
      setOpen(false)
    } catch (e) {
      toast.error('Erro ao gerar cronograma.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 min-h-[44px]">
          <Wand2 className="h-4 w-4" />
          Gerar Cronograma
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Gerar Cronograma</DialogTitle>
          <DialogDescription>
            Configure as opções e clique em Gerar para criar o cronograma automaticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="year">Ano</Label>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger id="year" className="min-h-[44px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="vpd">Vendedores por data</Label>
            <Select value={vendorsPerDay} onValueChange={(v) => setVendorsPerDay(v as '2' | '3')}>
              <SelectTrigger id="vpd" className="min-h-[44px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2">2 vendedores</SelectItem>
                <SelectItem value="3">3 vendedores</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {existing && lockedCount === 0 && (
            <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
              Já existe um cronograma para {year}. Gerar novamente irá substituí-lo.
            </p>
          )}

          {existing && lockedCount > 0 && (
            <p className="text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-md px-3 py-2">
              {lockedCount} data(s) travada(s) serão preservadas. As demais serão redistribuídas.
            </p>
          )}

          <div className="text-sm text-muted-foreground bg-muted rounded-md px-3 py-2 space-y-1">
            <p className="font-medium text-foreground">Vendedores ativos:</p>
            <p>{vendors.filter((v) => v.active).map((v) => v.name).join(', ') || 'Nenhum'}</p>
            <p className="font-medium text-foreground pt-1">Feriados cadastrados para {year}:</p>
            <p>
              {(holidays[Number(year)] ?? []).length === 0
                ? 'Nenhum — importe na página de Feriados antes de gerar.'
                : `${(holidays[Number(year)] ?? []).length} feriado(s)`}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} className="min-h-[44px]">
            Cancelar
          </Button>
          <Button onClick={handleGenerate} disabled={loading} className="gap-2 min-h-[44px]">
            <Wand2 className="h-4 w-4" />
            {loading ? 'Gerando...' : 'Gerar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
