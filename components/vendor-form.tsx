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
import { Vendor } from '@/types'
import { toast } from 'sonner'

type Props = {
  open: boolean
  onClose: () => void
  vendor?: Vendor
}

export function VendorForm({ open, onClose, vendor }: Props) {
  const [name, setName] = useState(vendor?.name ?? '')
  const { addVendor, updateVendor } = useStore()

  const isEdit = !!vendor

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return

    if (isEdit) {
      await updateVendor(vendor.id, { name: trimmed })
      toast.success('Vendedor atualizado.')
    } else {
      await addVendor(trimmed)
      toast.success('Vendedor adicionado.')
    }
    setName('')
    onClose()
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="h-auto rounded-t-2xl">
        <form onSubmit={handleSubmit}>
          <SheetHeader className="mb-4">
            <SheetTitle>{isEdit ? 'Editar Vendedor' : 'Novo Vendedor'}</SheetTitle>
            <SheetDescription>
              {isEdit ? 'Atualize o nome do vendedor.' : 'Adicione um novo vendedor à equipe.'}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 pb-4 px-4">
            <div className="space-y-2">
              <Label htmlFor="vendor-name">Nome</Label>
              <Input
                id="vendor-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome do vendedor"
                autoFocus
                required
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
