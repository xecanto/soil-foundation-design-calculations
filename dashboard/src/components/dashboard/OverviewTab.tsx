'use client'

import { Stats, HistogramBucket, SoilType, ScatterPoint } from '@/types'
import StatsCards from './StatsCards'
import NValueHistogram from '@/components/charts/NValueHistogram'
import SoilTypePie from '@/components/charts/SoilTypePie'
import NVsCohesionScatter from '@/components/charts/NVsCohesionScatter'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Props {
  stats: Stats
  histogram: HistogramBucket[]
  soilTypes: SoilType[]
  scatter: ScatterPoint[]
}

export default function OverviewTab({ stats, histogram, soilTypes, scatter }: Props) {
  return (
    <div className="space-y-6">
      <StatsCards stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">N-Value Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <NValueHistogram data={histogram} title="N-Value Frequency" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Soil Classification (USCS)</CardTitle>
          </CardHeader>
          <CardContent>
            <SoilTypePie data={soilTypes} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">N-Value vs Cohesion by Soil Type</CardTitle>
        </CardHeader>
        <CardContent>
          <NVsCohesionScatter data={scatter} />
        </CardContent>
      </Card>
    </div>
  )
}
