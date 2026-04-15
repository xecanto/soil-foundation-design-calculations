'use client'

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Area, AreaChart,
} from 'recharts'
import { DepthProfile } from '@/types'

interface Props { data: DepthProfile[] }

export default function DepthProfileChart({ data }: Props) {
  const sorted = [...data].sort((a, b) => a.depth - b.depth)

  function formatTooltipValue(value: number | string | undefined) {
    return [typeof value === 'number' ? value : value ?? '', ''] as [string | number, string]
  }

  return (
    <div className="space-y-8">
      {/* N Value vs Depth */}
      <div>
        <p className="text-sm text-muted-foreground mb-2 font-medium">SPT N-Value vs Depth (ft)</p>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={sorted} margin={{ top: 5, right: 20, left: 0, bottom: 5 }} layout="vertical">
            <defs>
              <linearGradient id="nGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
            <YAxis
              type="number"
              dataKey="depth"
              reversed
              label={{ value: 'Depth (ft)', angle: -90, position: 'insideLeft', fontSize: 11 }}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            />
            <Tooltip
              contentStyle={{
                background: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 8,
              }}
              formatter={value => formatTooltipValue(value as number | string | undefined)}
              labelFormatter={(l) => `Depth: ${l} ft`}
            />
            <Legend />
            <Area dataKey="avg_n" name="Avg N-Value" stroke="#6366f1" fill="url(#nGrad)" type="monotone" />
            <Area dataKey="min_n" name="Min N-Value" stroke="#22d3ee" fill="none" strokeDasharray="4 2" type="monotone" />
            <Area dataKey="max_n" name="Max N-Value" stroke="#f59e0b" fill="none" strokeDasharray="4 2" type="monotone" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Cohesion vs Depth */}
      <div>
        <p className="text-sm text-muted-foreground mb-2 font-medium">Cohesion (kPa) vs Depth (ft)</p>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={sorted} margin={{ top: 5, right: 20, left: 0, bottom: 5 }} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
            <YAxis
              type="number" dataKey="depth" reversed
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            />
            <Tooltip
              contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }}
              labelFormatter={(l) => `Depth: ${l} ft`}
            />
            <Legend />
            <Line dataKey="avg_cohesion" name="Avg Cohesion (kPa)" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4 }} type="monotone" />
            <Line dataKey="avg_unit_weight" name="Avg Unit Weight (kN/m³)" stroke="#f43f5e" strokeWidth={2} strokeDasharray="5 3" type="monotone" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
