'use client'

import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import { LocationStat } from '@/types'

interface Props { data: LocationStat[] }

export default function LocationComparisonChart({ data }: Props) {
  const sorted = [...data].sort((a, b) => b.avg_n - a.avg_n).slice(0, 20)
  const chartData = sorted.map((d, i) => ({
    name: `R${d.report_no}`,
    avg_n: d.avg_n,
    avg_cohesion: d.avg_cohesion,
    max_depth: d.max_depth,
    samples: d.sample_count,
  }))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
        <YAxis yAxisId="left" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
        <Tooltip
          contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }}
        />
        <Legend />
        <Bar yAxisId="left" dataKey="avg_n" name="Avg N-Value" fill="#6366f1" radius={[3, 3, 0, 0]} />
        <Bar yAxisId="left" dataKey="avg_cohesion" name="Avg Cohesion (kPa)" fill="#10b981" radius={[3, 3, 0, 0]} />
        <Line yAxisId="right" type="monotone" dataKey="max_depth" name="Max Depth (ft)" stroke="#f59e0b" strokeWidth={2} dot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
