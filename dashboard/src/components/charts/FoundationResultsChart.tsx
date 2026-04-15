'use client'

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts'
import { FoundationResult } from '@/types'

interface Props { data: FoundationResult[] }

export default function FoundationResultsChart({ data }: Props) {
  function formatFeetValue(value: number | string | undefined) {
    const display = typeof value === 'number' ? `${value.toFixed(3)} ft` : value ?? ''
    return [display, ''] as [string, string]
  }

  function formatKpaValue(value: number | string | undefined) {
    const display = typeof value === 'number' ? `${value.toFixed(1)} kPa` : value ?? ''
    return [display, ''] as [string, string]
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground mb-2 font-medium">Foundation Width B (ft) vs Depth H (ft)</p>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="H_ft" label={{ value: 'H (ft)', position: 'insideBottom', offset: -3, fontSize: 11 }} tick={{ fontSize: 11 }} />
            <YAxis label={{ value: 'B (ft)', angle: -90, position: 'insideLeft', fontSize: 11 }} tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }}
              formatter={value => formatFeetValue(value as number | string | undefined)}
            />
            <ReferenceLine y={3} stroke="#f43f5e" strokeDasharray="4 2" label={{ value: 'B min 3ft', fontSize: 10 }} />
            <ReferenceLine y={20} stroke="#f43f5e" strokeDasharray="4 2" label={{ value: 'B max 20ft', fontSize: 10 }} />
            <Line type="monotone" dataKey="B_ft" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 5 }} name="B (ft)" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div>
        <p className="text-sm text-muted-foreground mb-2 font-medium">Ultimate & Allowable Bearing Capacity (kPa)</p>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="H_ft" label={{ value: 'H (ft)', position: 'insideBottom', offset: -3, fontSize: 11 }} tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }}
              formatter={value => formatKpaValue(value as number | string | undefined)}
            />
            <Legend />
            <Line type="monotone" dataKey="qu_kPa" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} name="qu (kPa)" />
            <Line type="monotone" dataKey="qa_kPa" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} name="qa (kPa)" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
