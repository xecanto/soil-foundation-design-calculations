'use client'

import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip, Legend,
} from 'recharts'
import { SoilType } from '@/types'

interface Props { data: SoilType[] }

export default function SoilRadarChart({ data }: Props) {
  // Normalize each metric to 0-100 for radar display
  const maxN = Math.max(...data.map(d => d.avg_n), 1)
  const maxC = Math.max(...data.map(d => d.avg_cohesion), 1)
  const maxUW = Math.max(...data.map(d => d.avg_unit_weight), 1)
  const maxCount = Math.max(...data.map(d => d.count), 1)

  const radarData = [
    { metric: 'Avg N-Value', ...Object.fromEntries(data.map(d => [d.type, Math.round((d.avg_n / maxN) * 100)])) },
    { metric: 'Avg Cohesion', ...Object.fromEntries(data.map(d => [d.type, Math.round((d.avg_cohesion / maxC) * 100)])) },
    { metric: 'Unit Weight', ...Object.fromEntries(data.map(d => [d.type, Math.round((d.avg_unit_weight / maxUW) * 100)])) },
    { metric: 'Sample Count', ...Object.fromEntries(data.map(d => [d.type, Math.round((d.count / maxCount) * 100)])) },
  ]

  const COLORS = ['#6366f1', '#22d3ee', '#f59e0b', '#10b981', '#f43f5e', '#a78bfa']

  return (
    <ResponsiveContainer width="100%" height={320}>
      <RadarChart data={radarData}>
        <PolarGrid stroke="hsl(var(--border))" />
        <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
        {data.map((d, i) => (
          <Radar
            key={d.type}
            name={d.type}
            dataKey={d.type}
            stroke={COLORS[i % COLORS.length]}
            fill={COLORS[i % COLORS.length]}
            fillOpacity={0.15}
            strokeWidth={2}
          />
        ))}
        <Tooltip
          contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }}
        />
        <Legend iconSize={10} formatter={(v) => <span style={{ fontSize: 10 }}>{v}</span>} />
      </RadarChart>
    </ResponsiveContainer>
  )
}
