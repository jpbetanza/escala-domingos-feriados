'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScheduleEntry, Vendor } from '@/types'
import { useStore } from '@/lib/store'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { Minus, Plus } from 'lucide-react'

type Props = {
  entry: ScheduleEntry
  year: number
  vendors: Vendor[]
  open: boolean
  onClose: () => void
}

export function EntryEditDialog({ entry, year, vendors, open, onClose }: Props) {
  const { updateEntry } = useStore()
  const schedule = useStore((s) => s.schedules[year])
  const vpd = schedule?.vendorsPerDay ?? 2
  const activeVendors = vendors.filter((v) => v.active)

  const [selectedIds, setSelectedIds] = useState<string[]>(entry.vendorIds)
  const [closed, setClosed] = useState(entry.closed)
  const [note, setNote] = useState(entry.note ?? '')
  const [count, setCount] = useState(
    entry.vendorsCount ?? Math.max(vpd, entry.vendorIds.length)
  )

  const maxCount = Math.max(activeVendors.length, count)
  const isFull = selectedIds.length >= count
  const isAdjusted = count !== vpd

  function changeCount(next: number) {
    const clamped = Math.min(maxCount, Math.max(1, next))
    setCount(clamped)
    setSelectedIds((prev) => prev.slice(0, clamped))
  }

  function toggleVendor(id: string) {
    if (closed) return
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= count) return prev
      return [...prev, id]
    })
  }

  async function handleSave() {
    await updateEntry(year, entry.id, {
      vendorIds: closed ? [] : selectedIds,
      closed,
      note: note.trim() || undefined,
      vendorsCount: isAdjusted ? count : undefined,
    })
    toast.success('Entrada atualizada.')
    onClose()
  }

  const dateStr = format(parseISO(entry.date), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar Entrada</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <p className="text-sm font-medium capitalize">{dateStr}</p>
            <Badge
              variant="secondary"
              className={cn('mt-1', entry.type === 'holiday' && 'bg-rose-100 text-rose-800')}
            >
              {entry.type === 'holiday' ? 'Feriado' : 'Domingo'}
            </Badge>
          </div>

          <div className={cn('rounded-lg border px-3.5 py-3 space-y-2.5', closed && 'opacity-40')}>
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <p id="vendors-count-label" className="text-sm font-semibold">Vendedores neste dia</p>
                <p className="text-xs text-muted-foreground">Padrão do ano: {vpd}</p>
              </div>
              <div
                role="group"
                aria-labelledby="vendors-count-label"
                className="flex items-center rounded-lg border overflow-hidden"
              >
                <button
                  type="button"
                  aria-label="Diminuir quantidade"
                  onClick={() => changeCount(count - 1)}
                  disabled={closed || count <= 1}
                  className="h-11 w-11 flex items-center justify-center hover:bg-muted disabled:text-muted-foreground/40 disabled:hover:bg-transparent"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span aria-live="polite" className="min-w-9 text-center text-base font-semibold tabular-nums">
                  {count}
                </span>
                <button
                  type="button"
                  aria-label="Aumentar quantidade"
                  onClick={() => changeCount(count + 1)}
                  disabled={closed || count >= maxCount}
                  className="h-11 w-11 flex items-center justify-center hover:bg-muted disabled:text-muted-foreground/40 disabled:hover:bg-transparent"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
            {isAdjusted && !closed && (
              <div className="flex items-center justify-between gap-2 rounded-md bg-blue-50 px-2.5 py-2 dark:bg-blue-950/40">
                <p className="text-xs leading-snug text-blue-900 dark:text-blue-200">
                  Só este dia muda. Ao gerar a escala de novo, ele continua com {count}.
                </p>
                <button
                  type="button"
                  onClick={() => changeCount(vpd)}
                  className="shrink-0 min-h-9 px-2.5 rounded text-xs font-semibold text-blue-700 hover:bg-blue-100 dark:text-blue-300 dark:hover:bg-blue-900/40"
                >
                  Voltar ao padrão
                </button>
              </div>
            )}
          </div>

          <div className="space-y-2.5">
            <div className="flex items-baseline justify-between">
              <Label>Quem trabalha</Label>
              <span
                className={cn(
                  'text-xs font-medium',
                  selectedIds.length === count ? 'text-green-700 dark:text-green-400' : 'text-muted-foreground'
                )}
              >
                {selectedIds.length} de {count} selecionados
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {activeVendors.map((vendor) => {
                const selected = selectedIds.includes(vendor.id)
                const blocked = !selected && isFull
                return (
                  <button
                    key={vendor.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggleVendor(vendor.id)}
                    disabled={closed}
                    className={cn(
                      'px-4 rounded-full text-sm font-medium border transition-colors min-h-[44px]',
                      selected && 'bg-primary text-primary-foreground border-primary',
                      !selected && !blocked && 'bg-background border-border hover:bg-muted',
                      blocked && 'bg-muted/40 text-muted-foreground border-dashed',
                      closed && 'opacity-40 cursor-not-allowed'
                    )}
                  >
                    {vendor.name}
                  </button>
                )
              })}
            </div>
            {isFull && !closed && (
              <p className="text-xs text-muted-foreground">
                Lista completa. Desmarque alguém ou aumente a quantidade acima.
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              id="closed"
              type="checkbox"
              checked={closed}
              onChange={(e) => {
                setClosed(e.target.checked)
                if (e.target.checked) setSelectedIds([])
              }}
              className="h-4 w-4"
            />
            <Label htmlFor="closed">Loja fechada nesta data</Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Observação (opcional)</Label>
            <Input
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ex: Todos, ZEISS, Meio período..."
              className="min-h-[44px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="min-h-[44px]">
            Cancelar
          </Button>
          <Button onClick={handleSave} className="min-h-[44px]">Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
