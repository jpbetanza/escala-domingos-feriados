'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Download, FileSpreadsheet, FileText } from 'lucide-react'
import { useStore } from '@/lib/store'
import { exportToExcel, exportToPDF } from '@/lib/export'
import { toast } from 'sonner'

type Props = {
  year: number
}

export function ExportButton({ year }: Props) {
  const [loading, setLoading] = useState<'pdf' | 'excel' | null>(null)
  const { schedules, vendors } = useStore()
  const schedule = schedules[year]

  async function handleExcel() {
    if (!schedule) return toast.error('Nenhum cronograma para exportar.')
    setLoading('excel')
    try {
      await exportToExcel(schedule, vendors)
      toast.success('Planilha Excel gerada com sucesso!')
    } catch (e) {
      toast.error('Erro ao exportar Excel.')
    } finally {
      setLoading(null)
    }
  }

  async function handlePDF() {
    if (!schedule) return toast.error('Nenhum cronograma para exportar.')
    setLoading('pdf')
    try {
      await exportToPDF(schedule, vendors)
      toast.success('PDF gerado com sucesso!')
    } catch (e) {
      console.error(e)
      toast.error('Erro ao exportar PDF.')
    } finally {
      setLoading(null)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2 min-h-[44px]" disabled={!!loading}>
          <Download className="h-4 w-4" />
          {loading ? 'Exportando...' : 'Exportar'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleExcel} className="gap-2 cursor-pointer">
          <FileSpreadsheet className="h-4 w-4" />
          Exportar Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handlePDF} className="gap-2 cursor-pointer">
          <FileText className="h-4 w-4" />
          Exportar PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
