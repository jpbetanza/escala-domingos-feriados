'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useStore } from '@/lib/store'
import { Holiday } from '@/types'
import { toast } from 'sonner'

type Props = {
  open: boolean
  onClose: () => void
  year: number
  holiday?: Holiday
}

export function HolidayForm({ open, onClose, year, holiday }: Props) {
  const [date, setDate] = useState(holiday?.date ?? `${year}-01-01`)
  const [name, setName] = useState(holiday?.name ?? '')
  const { addHoliday, updateHoliday } = useStore()

  const isEdit = !!holiday

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName || !date) return

    if (isEdit) {
      await updateHoliday(year, holiday.id, { date, name: trimmedName })
      toast.success('Feriado atualizado.')
    } else {
      await addHoliday(year, { date, name: trimmedName })
      toast.success('Feriado adicionado.')
    }
    setDate(`${year}-01-01`)
    setName('')
    onClose()
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="h-auto rounded-t-2xl">
        <form onSubmit={handleSubmit}>
          <SheetHeader className="mb-4">
            <SheetTitle>{isEdit ? 'Editar Feriado' : 'Novo Feriado'}</SheetTitle>
            <SheetDescription>
              {isEdit
                ? 'Atualize as informações do feriado.'
                : `Adicione um feriado para o ano ${year}.`}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 pb-4 px-4">
            <div className="space-y-2">
              <Label htmlFor="holiday-date">Data</Label>
              <Input
                id="holiday-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="min-h-[44px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="holiday-name">Nome</Label>
              <Input
                id="holiday-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Corpus Christi, Aniversário da cidade..."
                required
                autoFocus
                className="min-h-[44px]"
              />
            </div>
          </div>

          <SheetFooter className="flex-row gap-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 min-h-[44px]">
              Cancelar
            </Button>
            <Button type="submit" className="flex-1 min-h-[44px]">
              {isEdit ? 'Salvar' : 'Adicionar'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
