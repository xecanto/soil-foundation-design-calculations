'use client'

import { Stats } from '@/types'
import { Card, CardContent } from '@/components/ui/card'
import {
  Activity, MapPin, FlaskConical, BarChart3, Layers, TrendingUp,
} from 'lucide-react'

interface KPICardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ReactNode
  gradient: string
}

function KPICard({ title, value, subtitle, icon, gradient }: KPICardProps) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className={`${gradient} p-5 relative`}>
          <div className="absolute top-4 right-4 opacity-20">{icon}</div>
          <p className="text-sm font-medium text-white/80">{title}</p>
          <p className="text-3xl font-bold text-white mt-1">{value}</p>
          {subtitle && <p className="text-xs text-white/70 mt-1">{subtitle}</p>}
        </div>
      </CardContent>
    </Card>
  )
}

interface Props { stats: Stats }

export default function StatsCards({ stats }: Props) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
      <KPICard
        title="Total Samples"
        value={stats.total_samples.toLocaleString()}
        subtitle="SPT data points"
        icon={<Activity size={40} />}
        gradient="bg-gradient-to-br from-indigo-500 to-indigo-700"
      />
      <KPICard
        title="Reports"
        value={stats.total_reports}
        subtitle="Borehole reports"
        icon={<FlaskConical size={40} />}
        gradient="bg-gradient-to-br from-cyan-500 to-cyan-700"
      />
      <KPICard
        title="Unique Sites"
        value={stats.unique_locations}
        subtitle="Geo-locations"
        icon={<MapPin size={40} />}
        gradient="bg-gradient-to-br from-emerald-500 to-emerald-700"
      />
      <KPICard
        title="Avg N-Value"
        value={stats.avg_n_value}
        subtitle={`Range: ${stats.min_n_value}–${stats.max_n_value}`}
        icon={<BarChart3 size={40} />}
        gradient="bg-gradient-to-br from-amber-500 to-amber-700"
      />
      <KPICard
        title="Avg Cohesion"
        value={`${stats.avg_cohesion} kPa`}
        subtitle="Weighted average"
        icon={<Layers size={40} />}
        gradient="bg-gradient-to-br from-rose-500 to-rose-700"
      />
      <KPICard
        title="Max Depth"
        value={`${stats.max_depth} ft`}
        subtitle="Deepest sample"
        icon={<TrendingUp size={40} />}
        gradient="bg-gradient-to-br from-violet-500 to-violet-700"
      />
    </div>
  )
}
