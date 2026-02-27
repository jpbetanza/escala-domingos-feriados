'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Vendor } from '@/types'
import { VendorStats } from '@/lib/scheduler'

type Props = {
  vendor: Vendor
  stats: VendorStats | undefined
  maxSundays: number
  maxHolidays: number
}

export function VendorStatsCard({ vendor, stats, maxSundays, maxHolidays }: Props) {
  const sundays = stats?.sundayCount ?? 0
  const holidays = stats?.holidayCount ?? 0
  const total = stats?.totalPoints ?? 0

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{vendor.name}</CardTitle>
          <Badge variant="secondary">{total} pts</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Domingos</span>
            <span className="font-medium text-foreground">{sundays}</span>
          </div>
          <Progress
            value={maxSundays > 0 ? (sundays / maxSundays) * 100 : 0}
            className="h-1.5"
          />
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Feriados</span>
            <span className="font-medium text-foreground">{holidays}</span>
          </div>
          <Progress
            value={maxHolidays > 0 ? (holidays / maxHolidays) * 100 : 0}
            className="h-1.5"
          />
        </div>
      </CardContent>
    </Card>
  )
}
