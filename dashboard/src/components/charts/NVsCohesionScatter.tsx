'use client'

import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ZAxis,
} from 'recharts'
import { ScatterPoint } from '@/types'

const SOIL_COLORS: Record<string, string> = {
  'SILTY CLAY': '#6366f1',
  'SANDY SILTY CLAY': '#22d3ee',
  'SANDSTONE': '#f59e0b',
  'SHALE': '#10b981',
  'SILTY SAND': '#f43f5e',
  'SAND': '#a78bfa',
}
function colorFor(uscs: string) {
  return SOIL_COLORS[uscs.toUpperCase()] ?? '#94a3b8'
}

interface Props { data: ScatterPoint[] }

export default function NVsCohesionScatter({ data }: Props) {
  // Group by USCS type
  const groups: Record<string, ScatterPoint[]> = {}
  for (const d of data) {
    const key = (d.uscs ?? 'UNKNOWN').toUpperCase().trim()
    if (!groups[key]) groups[key] = []
    groups[key].push(d)
  }

  function formatTooltipValue(value: number | string | undefined, name: number | string | undefined) {
    const displayValue = typeof value === 'number' ? value : value ?? ''
    const displayName = typeof name === 'string' ? name : name?.toString() ?? ''
    return [displayValue, displayName] as [number | string, string]
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ScatterChart margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis
          dataKey="n_value" name="N Value" type="number"
          label={{ value: 'N Value', position: 'insideBottom', offset: -2, fontSize: 11 }}
          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
        />
        <YAxis
          dataKey="cohesion" name="Cohesion (kPa)" type="number"
          label={{ value: 'Cohesion (kPa)', angle: -90, position: 'insideLeft', fontSize: 11 }}
          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
        />
        <ZAxis range={[30, 30]} />
        <Tooltip
          cursor={{ strokeDasharray: '3 3' }}
          contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }}
          formatter={(value, name) => formatTooltipValue(value as number | string | undefined, name as number | string | undefined)}
        />
        <Legend />
        {Object.entries(groups).map(([uscs, pts]) => (
          <Scatter key={uscs} name={uscs} data={pts} fill={colorFor(uscs)} opacity={0.75} />
        ))}
      </ScatterChart>
    </ResponsiveContainer>
  )
}
