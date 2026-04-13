'use client'

import { DepthProfile, HistogramBucket } from '@/types'
import DepthProfileChart from '@/components/charts/DepthProfileChart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'

const COHESION_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f97316',
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
]

interface Props {
  depthProfiles: DepthProfile[]
  cohesionHistogram: HistogramBucket[]
}

export default function DepthAnalysisTab({ depthProfiles, cohesionHistogram }: Props) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Depth profile chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">N-Value Profile with Depth</CardTitle>
          </CardHeader>
          <CardContent>
            <DepthProfileChart data={depthProfiles} />
          </CardContent>
        </Card>

        {/* Cohesion histogram */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cohesion Distribution (kPa)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={cohesionHistogram} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="bucket" angle={-35} textAnchor="end" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} label={{ value: 'Count', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }} />
                <Tooltip
                  formatter={(v: number) => [v, 'Count']}
                  contentStyle={{ borderRadius: '8px', fontSize: '13px' }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {cohesionHistogram.map((_, i) => (
                    <Cell key={i} fill={COHESION_COLORS[i % COHESION_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Depth summary table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Depth-Wise Statistics Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 font-semibold text-muted-foreground">Depth (ft)</th>
                  <th className="text-right py-2 px-3 font-semibold text-muted-foreground">Count</th>
                  <th className="text-right py-2 px-3 font-semibold text-muted-foreground">Avg N</th>
                  <th className="text-right py-2 px-3 font-semibold text-muted-foreground">Min N</th>
                  <th className="text-right py-2 px-3 font-semibold text-muted-foreground">Max N</th>
                  <th className="text-right py-2 px-3 font-semibold text-muted-foreground">Avg Cohesion (kPa)</th>
                  <th className="text-right py-2 px-3 font-semibold text-muted-foreground">Avg γ (kN/m³)</th>
                </tr>
              </thead>
              <tbody>
                {depthProfiles.map((row) => (
                  <tr key={row.depth} className="border-b hover:bg-muted/40 transition-colors">
                    <td className="py-2 px-3 font-medium">{row.depth}</td>
                    <td className="py-2 px-3 text-right">{row.count}</td>
                    <td className="py-2 px-3 text-right text-indigo-600 font-semibold">{row.avg_n}</td>
                    <td className="py-2 px-3 text-right">{row.min_n}</td>
                    <td className="py-2 px-3 text-right">{row.max_n}</td>
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
