'use client'

import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ZAxis, Cell,
} from 'recharts'
import { LocationStat } from '@/types'

const CustomDot = (props: { cx?: number; cy?: number; payload?: LocationStat }) => {
  const { cx = 0, cy = 0, payload } = props
  const r = Math.max(6, Math.min(20, (payload?.sample_count ?? 1) * 2))
  const intensity = Math.min(255, Math.round(((payload?.avg_n ?? 0) / 50) * 200 + 55))
  const fill = `rgb(${255 - intensity}, ${intensity / 2}, ${intensity})`
  return (
    <circle cx={cx} cy={cy} r={r} fill={fill} stroke="white" strokeWidth={1.5} opacity={0.85} />
  )
}

interface Props { data: LocationStat[] }

export default function GeoScatterMap({ data }: Props) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-2">
        Dot size = sample count · Color: blue→red = low→high avg N-value
      </p>
      <ResponsiveContainer width="100%" height={380}>
        <ScatterChart margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="longitude" type="number" name="Longitude"
            domain={['dataMin - 0.01', 'dataMax + 0.01']}
            label={{ value: 'Longitude (E)', position: 'insideBottom', offset: -5, fontSize: 11 }}
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            tickFormatter={v => v.toFixed(3)}
          />
          <YAxis
            dataKey="latitude" type="number" name="Latitude"
            domain={['dataMin - 0.005', 'dataMax + 0.005']}
            label={{ value: 'Latitude (N)', angle: -90, position: 'insideLeft', fontSize: 11 }}
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            tickFormatter={v => v.toFixed(3)}
          />
          <ZAxis range={[60, 60]} />
          <Tooltip
            cursor={{ strokeDasharray: '3 3' }}
            contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
            formatter={(v, n) => [typeof v === 'number' ? v.toFixed(4) : v, n]}
          />
          <Scatter
            data={data}
            shape={(props: any) => <CustomDot {...props} />}
          />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  )
}
