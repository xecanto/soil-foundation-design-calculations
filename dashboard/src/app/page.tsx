'use client'

import { useEffect, useState } from 'react'
import { fetchAPI } from '@/lib/api'
import {
  Stats, HistogramBucket, SoilType, DepthProfile, ScatterPoint, LocationStat,
} from '@/types'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import OverviewTab from '@/components/dashboard/OverviewTab'
import DepthAnalysisTab from '@/components/dashboard/DepthAnalysisTab'
import SoilClassificationTab from '@/components/dashboard/SoilClassificationTab'
import GeographicTab from '@/components/dashboard/GeographicTab'
import DataTableTab from '@/components/dashboard/DataTableTab'
import FoundationDesignTab from '@/components/dashboard/FoundationDesignTab'
import {
  LayoutDashboard, Layers, FlaskConical, Map, Table2, Calculator,
} from 'lucide-react'

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [histogram, setHistogram] = useState<HistogramBucket[]>([])
  const [cohesionHist, setCohesionHist] = useState<HistogramBucket[]>([])
  const [soilTypes, setSoilTypes] = useState<SoilType[]>([])
  const [depthProfiles, setDepthProfiles] = useState<DepthProfile[]>([])
  const [scatter, setScatter] = useState<ScatterPoint[]>([])
  const [locations, setLocations] = useState<LocationStat[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadAll() {
      setLoading(true)
      try {
        const [s, h, ch, st, dp, sc, lc] = await Promise.all([
          fetchAPI<Stats>('/stats'),
          fetchAPI<HistogramBucket[]>('/n-value-histogram'),
          fetchAPI<HistogramBucket[]>('/cohesion-histogram'),
          fetchAPI<SoilType[]>('/soil-types'),
          fetchAPI<DepthProfile[]>('/depth-profiles'),
          fetchAPI<ScatterPoint[]>('/scatter'),
          fetchAPI<LocationStat[]>('/locations'),
        ])
        setStats(s)
        setHistogram(h)
        setCohesionHist(ch)
        setSoilTypes(st)
        setDepthProfiles(dp)
        setScatter(sc)
        setLocations(lc)
      } catch (err) {
        console.error('Failed to load dashboard data:', err)
      } finally {
        setLoading(false)
      }
    }
    loadAll()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50 shadow-sm">
        <div className="max-w-screen-xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900 leading-tight">
              Geotechnical Dashboard
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Islamabad Zone 4 · Site-Specific Sub-soil Characterization · FYDP
            </p>
          </div>
          <div className="flex items-center gap-3">
            {stats && (
              <div className="hidden md:flex items-center gap-4 text-sm text-muted-foreground">
                <span><strong className="text-slate-700">{stats.total_samples.toLocaleString()}</strong> samples</span>
                <span>·</span>
                <span><strong className="text-slate-700">{stats.total_reports}</strong> reports</span>
                <span>·</span>
                <span><strong className="text-slate-700">{stats.unique_locations}</strong> sites</span>
              </div>
            )}
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shadow">
              HI
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-screen-xl mx-auto px-6 py-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center space-y-3">
              <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto" />
              <p className="text-sm text-muted-foreground">Loading geotechnical data…</p>
            </div>
          </div>
        ) : (
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="h-auto p-1 bg-white border shadow-sm rounded-xl flex flex-wrap gap-1">
              <TabsTrigger value="overview" className="flex items-center gap-1.5 rounded-lg data-[state=active]:bg-indigo-500 data-[state=active]:text-white">
                <LayoutDashboard size={14} />
                Overview
              </TabsTrigger>
              <TabsTrigger value="depth" className="flex items-center gap-1.5 rounded-lg data-[state=active]:bg-indigo-500 data-[state=active]:text-white">
                <Layers size={14} />
                Depth Analysis
              </TabsTrigger>
              <TabsTrigger value="soil" className="flex items-center gap-1.5 rounded-lg data-[state=active]:bg-indigo-500 data-[state=active]:text-white">
                <FlaskConical size={14} />
                Soil Classification
              </TabsTrigger>
              <TabsTrigger value="geo" className="flex items-center gap-1.5 rounded-lg data-[state=active]:bg-indigo-500 data-[state=active]:text-white">
                <Map size={14} />
                Geographic
              </TabsTrigger>
              <TabsTrigger value="data" className="flex items-center gap-1.5 rounded-lg data-[state=active]:bg-indigo-500 data-[state=active]:text-white">
                <Table2 size={14} />
                Data Table
              </TabsTrigger>
              <TabsTrigger value="foundation" className="flex items-center gap-1.5 rounded-lg data-[state=active]:bg-indigo-500 data-[state=active]:text-white">
                <Calculator size={14} />
                Foundation Design
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              {stats && (
                <OverviewTab
                  stats={stats}
                  histogram={histogram}
                  soilTypes={soilTypes}
                  scatter={scatter}
                />
              )}
            </TabsContent>

            <TabsContent value="depth">
              <DepthAnalysisTab
                depthProfiles={depthProfiles}
                cohesionHistogram={cohesionHist}
              />
            </TabsContent>

            <TabsContent value="soil">
              <SoilClassificationTab soilTypes={soilTypes} />
            </TabsContent>

            <TabsContent value="geo">
              <GeographicTab locations={locations} />
            </TabsContent>

            <TabsContent value="data">
              <DataTableTab />
            </TabsContent>

            <TabsContent value="foundation">
              <FoundationDesignTab />
            </TabsContent>
          </Tabs>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t mt-12 py-4 text-center text-xs text-muted-foreground">
        FYDP · Hassan Iliyas · Site-Specific Digitized Foundation Design · Islamabad Region
      </footer>
    </div>
  )
}
