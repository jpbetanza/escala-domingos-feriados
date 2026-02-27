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

type Props = {
  entry: ScheduleEntry
  year: number
  vendors: Vendor[]
  open: boolean
  onClose: () => void
}

export function EntryEditDialog({ entry, year, vendors, open, onClose }: Props) {
  const { updateEntry } = useStore()
  const [selectedIds, setSelectedIds] = useState<string[]>(entry.vendorIds)
  const [closed, setClosed] = useState(entry.closed)
  const [note, setNote] = useState(entry.note ?? '')

  const maxSel = 3
  const schedule = useStore((s) => s.schedules[year])
  const vpd = schedule?.vendorsPerDay ?? 2

  function toggleVendor(id: string) {
    if (closed) return
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= vpd) return [...prev.slice(1), id]
      return [...prev, id]
    })
  }

  async function handleSave() {
    await updateEntry(year, entry.id, {
      vendorIds: closed ? [] : selectedIds,
      closed,
      note: note.trim() || undefined,
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
            <Badge variant={entry.type === 'holiday' ? 'destructive' : 'secondary'} className="mt-1">
              {entry.type === 'holiday' ? 'Feriado' : 'Domingo'}
            </Badge>
          </div>

          <div className="space-y-2">
            <Label>Vendedores ({selectedIds.length}/{vpd})</Label>
            <div className="flex flex-wrap gap-2">
              {vendors
                .filter((v) => v.active)
                .map((vendor) => (
                  <button
                    key={vendor.id}
                    type="button"
                    onClick={() => toggleVendor(vendor.id)}
                    disabled={closed}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-sm font-medium border transition-colors min-h-[36px]',
                      selectedIds.includes(vendor.id)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background border-border hover:bg-muted',
                      closed && 'opacity-40 cursor-not-allowed'
                    )}
                  >
                    {vendor.name}
                  </button>
                ))}
            </div>
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
