'use client'

import { SoilType } from '@/types'
import SoilTypePie from '@/components/charts/SoilTypePie'
import SoilPropertiesBar from '@/components/charts/SoilPropertiesBar'
import SoilRadarChart from '@/components/charts/SoilRadarChart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface Props {
  soilTypes: SoilType[]
}

const USCS_DESCRIPTIONS: Record<string, string> = {
  GP: 'Poorly-graded gravel',
  GM: 'Silty gravel',
  GC: 'Clayey gravel',
  GW: 'Well-graded gravel',
  SP: 'Poorly-graded sand',
  SM: 'Silty sand',
  SC: 'Clayey sand',
  SW: 'Well-graded sand',
  ML: 'Low plasticity silt',
  CL: 'Low plasticity clay',
  MH: 'High plasticity silt',
  CH: 'High plasticity clay',
  OL: 'Organic low plasticity',
  OH: 'Organic high plasticity',
  PT: 'Peat',
}

export default function SoilClassificationTab({ soilTypes }: Props) {
  const total = soilTypes.reduce((s, t) => s + t.count, 0)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Soil Type Share</CardTitle>
          </CardHeader>
          <CardContent>
            <SoilTypePie data={soilTypes} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Radar — Normalized Properties</CardTitle>
          </CardHeader>
          <CardContent>
            <SoilRadarChart data={soilTypes} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Average Properties by Soil Type</CardTitle>
        </CardHeader>
        <CardContent>
          <SoilPropertiesBar data={soilTypes} />
        </CardContent>
      </Card>

      {/* Classification table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">USCS Classification Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 font-semibold text-muted-foreground">USCS</th>
                  <th className="text-left py-2 px-3 font-semibold text-muted-foreground">Description</th>
                  <th className="text-right py-2 px-3 font-semibold text-muted-foreground">Count</th>
                  <th className="text-right py-2 px-3 font-semibold text-muted-foreground">%</th>
                  <th className="text-right py-2 px-3 font-semibold text-muted-foreground">Avg N</th>
                  <th className="text-right py-2 px-3 font-semibold text-muted-foreground">Avg c (kPa)</th>
                  <th className="text-right py-2 px-3 font-semibold text-muted-foreground">Avg γ (kN/m³)</th>
                </tr>
              </thead>
              <tbody>
                {soilTypes.map((row) => (
                  <tr key={row.uscs_classification} className="border-b hover:bg-muted/40 transition-colors">
                    <td className="py-2 px-3">
                      <Badge variant="outline" className="font-mono">
                        {row.uscs_classification ?? '—'}
                      </Badge>
                    </td>
                    <td className="py-2 px-3 text-muted-foreground">
                      {USCS_DESCRIPTIONS[row.uscs_classification ?? ''] ?? '—'}
                    </td>
                    <td className="py-2 px-3 text-right">{row.count}</td>
                    <td className="py-2 px-3 text-right">
                      {total > 0 ? ((row.count / total) * 100).toFixed(1) : '0'}%
                    </td>
                    <td className="py-2 px-3 text-right text-indigo-600 font-semibold">{row.avg_n}</td>
                    <td className="py-2 px-3 text-right">{row.avg_cohesion}</td>
                    <td className="py-2 px-3 text-right">{row.avg_unit_weight}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
