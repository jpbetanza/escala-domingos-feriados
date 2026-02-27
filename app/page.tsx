'use client'

import { useState } from 'react'
import { useStore } from '@/lib/store'
import { computeStats } from '@/lib/scheduler'
import { VendorStatsCard } from '@/components/vendor-stats-card'
import { GenerateDialog } from '@/components/generate-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Calendar, Users, Sun, Star } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

const currentYear = new Date().getFullYear()
const years = [currentYear - 1, currentYear, currentYear + 1]

export default function DashboardPage() {
  const [year, setYear] = useState(currentYear)
  const { vendors, schedules } = useStore()

  const schedule = schedules[year]
  const stats = computeStats(schedule)
  const activeVendors = vendors.filter((v) => v.active)

  const totalSundays = schedule?.entries.filter((e) => e.type === 'sunday' && !e.closed).length ?? 0
  const totalHolidays = schedule?.entries.filter((e) => e.type === 'holiday' && !e.closed).length ?? 0
  const maxSundays = stats.length > 0 ? Math.max(...stats.map((s) => s.sundayCount)) : 0
  const maxHolidays = stats.length > 0 ? Math.max(...stats.map((s) => s.holidayCount)) : 0

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Visão geral do cronograma de vendedores
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-28 min-h-[44px]">
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
          <GenerateDialog defaultYear={year} />
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Users className="h-4 w-4" />
              <span className="text-xs">Vendedores ativos</span>
            </div>
            <p className="text-2xl font-bold">{activeVendors.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Calendar className="h-4 w-4" />
              <span className="text-xs">Total de datas</span>
            </div>
            <p className="text-2xl font-bold">{schedule?.entries.length ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Sun className="h-4 w-4" />
              <span className="text-xs">Domingos</span>
            </div>
            <p className="text-2xl font-bold">{totalSundays}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Star className="h-4 w-4" />
              <span className="text-xs">Feriados</span>
            </div>
            <p className="text-2xl font-bold">{totalHolidays}</p>
          </CardContent>
        </Card>
      </div>

      {/* Vendor stats */}
      {!schedule ? (
        <div className="border rounded-xl p-8 text-center space-y-3">
          <p className="text-muted-foreground">Nenhum cronograma gerado para {year}.</p>
          <GenerateDialog defaultYear={year} />
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Estatísticas por Vendedor</h2>
            <Button variant="link" asChild className="text-sm p-0 h-auto">
              <Link href="/cronograma">Ver cronograma completo →</Link>
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeVendors.map((vendor) => {
              const vendorStats = stats.find((s) => s.vendorId === vendor.id)
              return (
                <VendorStatsCard
                  key={vendor.id}
                  vendor={vendor}
                  stats={vendorStats}
                  maxSundays={maxSundays}
                  maxHolidays={maxHolidays}
                />
              )
            })}
          </div>

          {vendors.filter((v) => !v.active && stats.some((s) => s.vendorId === v.id)).length > 0 && (
            <>
              <h3 className="text-sm font-medium text-muted-foreground">Inativos (histórico)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {vendors
                  .filter((v) => !v.active && stats.some((s) => s.vendorId === v.id))
                  .map((vendor) => (
                    <VendorStatsCard
                      key={vendor.id}
                      vendor={vendor}
                      stats={stats.find((s) => s.vendorId === vendor.id)}
                      maxSundays={maxSundays}
                      maxHolidays={maxHolidays}
                    />
                  ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
