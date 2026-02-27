'use client'

import { useState } from 'react'
import { useStore } from '@/lib/store'
import { VendorForm } from '@/components/vendor-form'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Vendor } from '@/types'
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export default function VendedoresPage() {
  const { vendors, updateVendor, removeVendor } = useStore()
  const [formOpen, setFormOpen] = useState(false)
  const [editingVendor, setEditingVendor] = useState<Vendor | undefined>()
  const [deletingVendor, setDeletingVendor] = useState<Vendor | undefined>()

  const active = vendors.filter((v) => v.active)
  const inactive = vendors.filter((v) => !v.active)

  function handleEdit(vendor: Vendor) {
    setEditingVendor(vendor)
    setFormOpen(true)
  }

  function handleFormClose() {
    setFormOpen(false)
    setEditingVendor(undefined)
  }

  async function handleToggle(vendor: Vendor) {
    await updateVendor(vendor.id, { active: !vendor.active })
    toast.success(`${vendor.name} ${!vendor.active ? 'ativado' : 'desativado'}.`)
  }

  async function handleDelete(vendor: Vendor) {
    await removeVendor(vendor.id)
    setDeletingVendor(undefined)
    toast.success(`${vendor.name} removido.`)
  }

  const VendorItem = ({ vendor }: { vendor: Vendor }) => (
    <div className="flex items-center gap-3 p-3 md:p-4 border-b last:border-b-0">
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{vendor.name}</p>
        <Badge
          variant={vendor.active ? 'default' : 'secondary'}
          className="text-[10px] mt-0.5"
        >
          {vendor.active ? 'Ativo' : 'Inativo'}
        </Badge>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10"
          onClick={() => handleToggle(vendor)}
          title={vendor.active ? 'Desativar' : 'Ativar'}
        >
          {vendor.active ? (
            <ToggleRight className="h-5 w-5 text-green-600" />
          ) : (
            <ToggleLeft className="h-5 w-5 text-muted-foreground" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10"
          onClick={() => handleEdit(vendor)}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 text-destructive hover:text-destructive"
          onClick={() => setDeletingVendor(vendor)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Vendedores</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Gerencie a equipe de vendedores
          </p>
        </div>
        <Button
          onClick={() => { setEditingVendor(undefined); setFormOpen(true) }}
          className="gap-2 min-h-[44px]"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Adicionar</span>
        </Button>
      </div>

      {/* Active vendors */}
      <div className="border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b bg-muted/30">
          <h2 className="text-sm font-medium">Ativos ({active.length})</h2>
        </div>
        {active.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">Nenhum vendedor ativo.</p>
        ) : (
          active.map((v) => <VendorItem key={v.id} vendor={v} />)
        )}
      </div>

      {/* Inactive vendors */}
      {inactive.length > 0 && (
        <div className="border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b bg-muted/30">
            <h2 className="text-sm font-medium">Inativos ({inactive.length})</h2>
          </div>
          {inactive.map((v) => <VendorItem key={v.id} vendor={v} />)}
        </div>
      )}

      <VendorForm open={formOpen} onClose={handleFormClose} vendor={editingVendor} />

      {/* Delete confirmation */}
      <Dialog open={!!deletingVendor} onOpenChange={(v) => !v && setDeletingVendor(undefined)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover vendedor</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover <strong>{deletingVendor?.name}</strong>? Esta ação não pode ser desfeita. O vendedor será removido do histórico.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingVendor(undefined)} className="min-h-[44px]">
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletingVendor && handleDelete(deletingVendor)}
              className="min-h-[44px]"
            >
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
