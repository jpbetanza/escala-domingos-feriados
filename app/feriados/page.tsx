'use client'

import { useState } from 'react'
import { useStore } from '@/lib/store'
import { HolidayForm } from '@/components/holiday-form'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Holiday } from '@/types'
import { Plus, Pencil, Trash2, Download, Building2, Loader2, ChevronsUpDown, Check } from 'lucide-react'
import { toast } from 'sonner'
import { getBrazilianHolidays, BRAZILIAN_STATES } from '@/lib/holidays'
import { format, parseISO, isSunday } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const currentYear = new Date().getFullYear()
const years = [currentYear - 1, currentYear, currentYear + 1]

function capitalizeFirst(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export default function FeriadosPage() {
  const [year, setYear] = useState(currentYear)
  const { holidays, removeHoliday, setHolidays, addHolidays } = useStore()
  const [formOpen, setFormOpen] = useState(false)
  const [editingHoliday, setEditingHoliday] = useState<Holiday | undefined>()
  const [deletingHoliday, setDeletingHoliday] = useState<Holiday | undefined>()
  const [importConfirm, setImportConfirm] = useState(false)

  // Municipal import state
  const [importMunicipalOpen, setImportMunicipalOpen] = useState(false)
  const [selectedState, setSelectedState] = useState('')
  const [selectedCity, setSelectedCity] = useState('')
  const [cities, setCities] = useState<{ id: number; nome: string }[]>([])
  const [citiesLoading, setCitiesLoading] = useState(false)
  const [preview, setPreview] = useState<{ date: string; name: string }[] | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [stateOpen, setStateOpen] = useState(false)
  const [cityOpen, setCityOpen] = useState(false)

  const yearHolidays = (holidays[year] ?? []).slice().sort((a, b) => a.date.localeCompare(b.date))

  function handleEdit(holiday: Holiday) {
    setEditingHoliday(holiday)
    setFormOpen(true)
  }

  function handleFormClose() {
    setFormOpen(false)
    setEditingHoliday(undefined)
  }

  async function handleDelete(holiday: Holiday) {
    await removeHoliday(year, holiday.id)
    setDeletingHoliday(undefined)
    toast.success(`Feriado "${holiday.name}" removido.`)
  }

  async function handleImportBrazilian() {
    const presets = getBrazilianHolidays(year)
    await setHolidays(year, presets)
    setImportConfirm(false)
    toast.success(`${presets.length} feriados nacionais importados para ${year}.`)
  }

  function resetMunicipalDialog() {
    setSelectedState('')
    setSelectedCity('')
    setCities([])
    setCitiesLoading(false)
    setPreview(null)
    setPreviewLoading(false)
  }

  async function handleStateChange(state: string) {
    setSelectedState(state)
    setSelectedCity('')
    setPreview(null)
    setCities([])
    if (!state) return
    setCitiesLoading(true)
    try {
      const res = await fetch(`/api/cidades?estado=${state}`)
      const data: { id: number; nome: string }[] = await res.json()
      setCities(data)
    } catch {
      toast.error('Erro ao carregar cidades.')
      setCities([])
    } finally {
      setCitiesLoading(false)
    }
  }

  async function handleCityChange(city: { id: number; nome: string }) {
    setSelectedCity(city.nome)
    setPreview(null)
    setPreviewLoading(true)
    try {
      const res = await fetch(
        `/api/feriados-municipais?ano=${year}&ibge=${city.id}`
      )
      const data: { date: string; name: string }[] = await res.json()
      setPreview(data)
    } catch {
      toast.error('Erro ao buscar feriados.')
      setPreview([])
    } finally {
      setPreviewLoading(false)
    }
  }

  async function handleImportMunicipal() {
    if (!preview || preview.length === 0) return
    const existing = holidays[year] ?? []
    const existingDates = new Set(existing.map((h) => h.date))
    const newCount = preview.filter((h) => !existingDates.has(h.date)).length
    await addHolidays(year, preview)
    setImportMunicipalOpen(false)
    resetMunicipalDialog()
    if (newCount === 0) {
      toast.info('Nenhum feriado novo adicionado — todas as datas já existem.')
    } else {
      toast.success(`${newCount} feriado(s) adicionados para ${year}.`)
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Feriados</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Gerencie os feriados por ano
          </p>
        </div>
        <div className="flex items-center gap-2">
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
          <Button
            variant="outline"
            onClick={() => setImportConfirm(true)}
            className="gap-2 min-h-[44px]"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Importar Nacionais</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => setImportMunicipalOpen(true)}
            className="gap-2 min-h-[44px]"
          >
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Importar Municipais</span>
          </Button>
          <Button
            onClick={() => { setEditingHoliday(undefined); setFormOpen(true) }}
            className="gap-2 min-h-[44px]"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Adicionar</span>
          </Button>
        </div>
      </div>

      {/* List */}
      <div className="border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
          <h2 className="text-sm font-medium">
            Feriados de {year} ({yearHolidays.length})
          </h2>
        </div>

        {yearHolidays.length === 0 ? (
          <div className="p-8 text-center space-y-3">
            <p className="text-muted-foreground text-sm">
              Nenhum feriado cadastrado para {year}.
            </p>
            <Button variant="outline" onClick={() => setImportConfirm(true)} className="gap-2">
              <Download className="h-4 w-4" />
              Importar feriados nacionais
            </Button>
          </div>
        ) : (
          yearHolidays.map((holiday) => {
            const date = parseISO(holiday.date)
            const dateLabel = format(date, 'dd/MM/yyyy')
            const dayLabel = capitalizeFirst(format(date, 'EEEE', { locale: ptBR }))
            const fallsOnSunday = isSunday(date)

            return (
              <div
                key={holiday.id}
                className="flex items-center gap-3 p-3 md:p-4 border-b last:border-b-0"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm">{holiday.name}</p>
                    {fallsOnSunday && (
                      <Badge variant="outline" className="text-[10px]">
                        Domingo
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {dateLabel} — {dayLabel}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10"
                    onClick={() => handleEdit(holiday)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 text-destructive hover:text-destructive"
                    onClick={() => setDeletingHoliday(holiday)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )
          })
        )}
      </div>

      <HolidayForm
        open={formOpen}
        onClose={handleFormClose}
        year={year}
        holiday={editingHoliday}
      />

      {/* Delete confirmation */}
      <Dialog open={!!deletingHoliday} onOpenChange={(v) => !v && setDeletingHoliday(undefined)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover feriado</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover o feriado{' '}
              <strong>{deletingHoliday?.name}</strong> ({deletingHoliday?.date})?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingHoliday(undefined)} className="min-h-[44px]">
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletingHoliday && handleDelete(deletingHoliday)}
              className="min-h-[44px]"
            >
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import national confirmation */}
      <Dialog open={importConfirm} onOpenChange={setImportConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importar feriados nacionais</DialogTitle>
            <DialogDescription>
              Isso irá substituir todos os feriados de {year} pelos feriados nacionais
              brasileiros (incluindo Carnaval, Páscoa, Corpus Christi e datas fixas). Deseja
              continuar?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportConfirm(false)} className="min-h-[44px]">
              Cancelar
            </Button>
            <Button onClick={handleImportBrazilian} className="min-h-[44px]">Importar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import municipal — 2-step: state → city → preview */}
      <Dialog
        open={importMunicipalOpen}
        onOpenChange={(v) => {
          setImportMunicipalOpen(v)
          if (!v) resetMunicipalDialog()
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importar feriados municipais / estaduais</DialogTitle>
            <DialogDescription>
              Selecione o estado e o município para adicionar os feriados locais ao ano {year}.
              Datas que já existem na lista serão ignoradas.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-1">
            {/* State + City selectors side by side, each 50% */}
            <div className="flex gap-2">
              {/* State combobox */}
              <Popover open={stateOpen} onOpenChange={setStateOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={stateOpen}
                    className="w-1/2 justify-between font-normal min-h-[44px]"
                  >
                    <span className="truncate">
                      {selectedState
                        ? BRAZILIAN_STATES.find((s) => s.code === selectedState)?.name ?? selectedState
                        : 'Estado...'}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-0">
                  <Command>
                    <CommandInput placeholder="Buscar estado..." />
                    <CommandList>
                      <CommandEmpty>Nenhum estado encontrado.</CommandEmpty>
                      <CommandGroup>
                        {BRAZILIAN_STATES.map((s) => (
                          <CommandItem
                            key={s.code}
                            value={`${s.name} ${s.code}`}
                            onSelect={() => {
                              handleStateChange(s.code)
                              setStateOpen(false)
                            }}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                selectedState === s.code ? 'opacity-100' : 'opacity-0'
                              )}
                            />
                            {s.name} — {s.code}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              {/* City combobox */}
              <Popover open={cityOpen} onOpenChange={setCityOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={cityOpen}
                    disabled={citiesLoading || cities.length === 0}
                    className="w-1/2 justify-between font-normal min-h-[44px]"
                  >
                    {citiesLoading ? (
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Carregando...
                      </span>
                    ) : (
                      <span className="truncate">
                        {selectedCity || 'Cidade...'}
                      </span>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-0">
                  <Command>
                    <CommandInput placeholder="Buscar cidade..." />
                    <CommandList>
                      <CommandEmpty>Nenhuma cidade encontrada.</CommandEmpty>
                      <CommandGroup>
                        {cities.map((c) => (
                          <CommandItem
                            key={c.id}
                            value={c.nome}
                            onSelect={() => {
                              handleCityChange(c)
                              setCityOpen(false)
                            }}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                selectedCity === c.nome ? 'opacity-100' : 'opacity-0'
                              )}
                            />
                            {c.nome}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Holidays preview loading */}
            {previewLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Buscando feriados...
              </div>
            )}

            {/* Preview results */}
            {!previewLoading && preview !== null && (
              preview.length === 0 ? (
                <p className="text-sm text-muted-foreground border rounded-md p-3">
                  Nenhum feriado municipal/estadual encontrado.
                </p>
              ) : (
                <ul className="space-y-1 text-sm text-muted-foreground border rounded-md p-3 max-h-48 overflow-y-auto">
                  {preview.map((h) => (
                    <li key={h.date} className="flex justify-between gap-2">
                      <span>{h.name}</span>
                      <span className="font-mono text-xs shrink-0">{h.date}</span>
                    </li>
                  ))}
                </ul>
              )
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setImportMunicipalOpen(false)
                resetMunicipalDialog()
              }}
              className="min-h-[44px]"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleImportMunicipal}
              disabled={!preview || preview.length === 0}
              className="min-h-[44px]"
            >
              Importar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
