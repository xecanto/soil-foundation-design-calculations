'use client'

import { useEffect, useState } from 'react'
import { fetchAPI } from '@/lib/api'
import {
  Stats, HistogramBucket, SoilType, DepthProfile, ScatterPoint, LocationStat,
} from '@/types'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import GeofoundLogo from '@/components/ui/geofound-logo'
import OverviewTab from '@/components/dashboard/OverviewTab'
import DepthAnalysisTab from '@/components/dashboard/DepthAnalysisTab'
import SoilClassificationTab from '@/components/dashboard/SoilClassificationTab'
import GeographicTab from '@/components/dashboard/GeographicTab'
import DataTableTab from '@/components/dashboard/DataTableTab'
import FoundationDesignTab from '@/components/dashboard/FoundationDesignTab'
import {
  Activity, ArrowRight, Calculator, Database, FlaskConical, Layers, LayoutDashboard, Map, Table2,
} from 'lucide-react'

type TabValue = 'overview' | 'depth' | 'soil' | 'geo' | 'data' | 'foundation'

const tabItems: Array<{ value: TabValue; label: string; icon: typeof LayoutDashboard }> = [
  { value: 'overview', label: 'Overview', icon: LayoutDashboard },
  { value: 'depth', label: 'Depth Analysis', icon: Layers },
  { value: 'soil', label: 'Soil Classification', icon: FlaskConical },
  { value: 'geo', label: 'Geographic', icon: Map },
  { value: 'data', label: 'Data Table', icon: Table2 },
  { value: 'foundation', label: 'Foundation Design', icon: Calculator },
]

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [histogram, setHistogram] = useState<HistogramBucket[]>([])
  const [cohesionHist, setCohesionHist] = useState<HistogramBucket[]>([])
  const [soilTypes, setSoilTypes] = useState<SoilType[]>([])
  const [depthProfiles, setDepthProfiles] = useState<DepthProfile[]>([])
  const [scatter, setScatter] = useState<ScatterPoint[]>([])
  const [locations, setLocations] = useState<LocationStat[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabValue>('overview')

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

  function openSection(tab: TabValue) {
    setActiveTab(tab)
    window.requestAnimationFrame(() => {
      document.getElementById('workspace-panels')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    })
  }

  const highlightCards = [
    {
      label: 'Digitized Samples',
      value: loading ? 'Loading...' : stats ? stats.total_samples.toLocaleString() : 'Unavailable',
      detail: 'Mapped SPT and soil property records',
    },
    {
      label: 'Investigated Sites',
      value: loading ? 'Loading...' : stats ? stats.unique_locations.toString() : 'Unavailable',
      detail: 'Location-aware exploration across Zone 4',
    },
    {
      label: 'Design Depth Envelope',
      value: loading ? 'Loading...' : stats ? `${stats.max_depth} ft` : 'Unavailable',
      detail: 'Profiles ready for shallow foundation review',
    },
  ]

  const quickActions: Array<{ title: string; body: string; tab: TabValue; icon: typeof LayoutDashboard }> = [
    {
      title: 'Open Foundation Designer',
      body: 'Jump straight into map-driven location selection and footing iterations.',
      tab: 'foundation',
      icon: Calculator,
    },
    {
      title: 'Review Ground Trends',
      body: 'See distributions, cohesion trends, and material behavior at a glance.',
      tab: 'overview',
      icon: Activity,
    },
    {
      title: 'Inspect Spatial Coverage',
      body: 'Compare locations and navigate the project area geographically.',
      tab: 'geo',
      icon: Map,
    },
    {
      title: 'Browse the Raw Records',
      body: 'Access the underlying tabular data supporting the visual summaries.',
      tab: 'data',
      icon: Database,
    },
  ]

  return (
    <div className="min-h-screen text-slate-950">
      <header className="sticky top-0 z-50 border-b border-white/50 bg-white/65 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <GeofoundLogo className="w-48 sm:w-55" />

          <div className="hidden items-center gap-4 md:flex">
            <div className="text-right text-sm text-slate-600">
              <p className="font-semibold text-slate-900">
                {loading ? 'Preparing dataset...' : `${stats?.total_reports ?? 0} reports available`}
              </p>
              <p>Islamabad Zone 4 · Digitized boreholes, soil layers, and foundation sizing.</p>
            </div>
            <Button
              onClick={() => openSection('foundation')}
              className="rounded-full bg-slate-950 px-5 text-white hover:bg-slate-800"
            >
              Launch Designer
              <ArrowRight size={16} />
            </Button>
          </div>
        </div>
      </header>

      <main className="relative overflow-hidden">
        <div className="hero-grid pointer-events-none absolute inset-x-0 top-0 h-160 opacity-60" />
        <div className="pointer-events-none absolute left-[6%] top-24 h-40 w-40 rounded-full bg-amber-200/50 blur-3xl floating-orb" />
        <div className="pointer-events-none absolute right-[8%] top-16 h-56 w-56 rounded-full bg-sky-200/50 blur-3xl floating-orb-delayed" />

        <section className="mx-auto max-w-7xl px-6 pb-10 pt-12 lg:pb-14 lg:pt-16">
          <div className="grid items-start gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="relative z-10 space-y-8 enter-up">
              <div className="inline-flex items-center rounded-full border border-white/70 bg-white/70 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-slate-700 shadow-sm backdrop-blur">
                Site-specific subsurface characterization and footing design
              </div>

              <div className="space-y-5">
                <h2 className="max-w-4xl text-5xl font-semibold leading-[0.95] tracking-tight text-slate-950 sm:text-6xl xl:text-7xl">
                  Ground data that turns into
                  <span className="block text-gradient"> confident foundation decisions.</span>
                </h2>
                <p className="max-w-2xl text-base leading-8 text-slate-700 sm:text-lg">
                  Open the platform with a clear narrative first: explore the Zone 4 investigation envelope,
                  understand the soil behavior, then move directly into map-guided shallow foundation sizing.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={() => openSection('foundation')}
                  size="lg"
                  className="rounded-full bg-slate-950 px-7 text-white hover:bg-slate-800"
                >
                  Start Foundation Design
                  <ArrowRight size={16} />
                </Button>
                <Button
                  onClick={() => openSection('overview')}
                  size="lg"
                  variant="outline"
                  className="rounded-full border-slate-300 bg-white/70 px-7 text-slate-800 hover:bg-white"
                >
                  Explore Ground Data
                </Button>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {highlightCards.map(card => (
                  <div key={card.label} className="soft-panel rounded-3xl p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                      {card.label}
                    </p>
                    <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                      {card.value}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {card.detail}
                    </p>
                  </div>
                ))}
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-3xl border border-slate-200/70 bg-white/70 p-5 shadow-sm backdrop-blur">
                  <p className="text-sm font-semibold text-slate-900">Interactive site context</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Location-aware records, depth trends, and comparison plots are reachable from one surface.
                  </p>
                </div>
                <div className="rounded-3xl border border-slate-200/70 bg-white/70 p-5 shadow-sm backdrop-blur">
                  <p className="text-sm font-semibold text-slate-900">Layer-driven calculation flow</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Soil layers can be auto-filled from the database or manually refined before running design checks.
                  </p>
                </div>
                <div className="rounded-3xl border border-slate-200/70 bg-white/70 p-5 shadow-sm backdrop-blur">
                  <p className="text-sm font-semibold text-slate-900">Engineering-first navigation</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    The first screen now prioritizes orientation, credibility, and a clear route into the workflow.
                  </p>
                </div>
              </div>
            </div>

            <div className="relative z-10 enter-up-delayed">
              <div className="rounded-4xl border border-white/60 bg-white/72 p-6 shadow-[0_20px_55px_rgba(31,49,82,0.09)] backdrop-blur-xl sm:p-8">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-sky-900/50">
                      Live project snapshot
                    </p>
                    <h3 className="mt-3 max-w-md text-3xl font-semibold tracking-tight text-slate-950">
                      From borehole records to footing width recommendations.
                    </h3>
                  </div>
                  <div className="rounded-3xl border border-slate-200/70 bg-white/65 px-5 py-4 shadow-sm backdrop-blur">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                      Data intelligence
                    </p>
                    <p className="mt-2 text-lg font-semibold tracking-tight text-slate-950">
                      Live geotechnical model
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      Built from reports, boreholes, and soil layers.
                    </p>
                  </div>
                </div>

                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-3xl border border-slate-200/70 bg-white/68 p-5">
                    <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Coverage</p>
                    <p className="mt-3 text-2xl font-semibold text-slate-950">Zone 4 corridor</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Focused on sampled locations, depth envelopes, and material properties relevant to shallow foundations.
                    </p>
                  </div>
                  <div className="rounded-3xl border border-slate-200/70 bg-white/68 p-5">
                    <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Quick facts</p>
                    <div className="mt-4 space-y-4 text-sm text-slate-700">
                      <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-3">
                        <span>Average N-value</span>
                        <strong className="text-slate-950">{loading ? '...' : stats?.avg_n_value ?? '--'}</strong>
                      </div>
                      <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-3">
                        <span>Average cohesion</span>
                        <strong className="text-slate-950">{loading ? '...' : stats ? `${stats.avg_cohesion} kPa` : '--'}</strong>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span>Geographic records</span>
                        <strong className="text-slate-950">{loading ? '...' : locations.length}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 rounded-[1.75rem] border border-slate-200/65 bg-white/66 p-6">
                  <div className="flex items-center gap-3 text-slate-900">
                    <div className="rounded-2xl bg-amber-50 p-2 text-amber-700">
                      <Calculator size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Recommended flow</p>
                      <p className="text-sm text-slate-600">Review the dataset overview, inspect site context, then run foundation sizing.</p>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-3 text-sm text-slate-700">
                    <div className="flex items-start gap-3 rounded-2xl bg-slate-50/80 px-4 py-3">
                      <span className="mt-0.5 text-xs font-bold text-sky-700">01</span>
                      <p>Scan summary metrics and depth trends to understand the investigation envelope.</p>
                    </div>
                    <div className="flex items-start gap-3 rounded-2xl bg-slate-50/80 px-4 py-3">
                      <span className="mt-0.5 text-xs font-bold text-sky-700">02</span>
                      <p>Use the geographic tab or the map picker to locate the site and prefill layers.</p>
                    </div>
                    <div className="flex items-start gap-3 rounded-2xl bg-slate-50/80 px-4 py-3">
                      <span className="mt-0.5 text-xs font-bold text-sky-700">03</span>
                      <p>Run the Terzaghi-based footing calculations and compare valid iterations.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 pb-14">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {quickActions.map(action => {
              const Icon = action.icon

              return (
                <button
                  key={action.title}
                  type="button"
                  onClick={() => openSection(action.tab)}
                  className="group rounded-[1.75rem] border border-slate-200/70 bg-white/75 p-6 text-left shadow-sm backdrop-blur transition-all hover:-translate-y-1 hover:border-sky-300 hover:shadow-xl"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="rounded-2xl bg-slate-100 p-3 text-slate-900 transition-colors group-hover:bg-sky-100 group-hover:text-sky-800">
                      <Icon size={20} />
                    </div>
                    <ArrowRight size={18} className="text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-slate-900" />
                  </div>
                  <h3 className="mt-5 text-xl font-semibold tracking-tight text-slate-950">{action.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{action.body}</p>
                </button>
              )
            })}
          </div>
        </section>

        <section id="workspace-panels" className="section-anchor-offset mx-auto max-w-7xl px-6 pb-16">
          <div className="rounded-4xl border border-white/60 bg-white/70 p-6 shadow-[0_30px_80px_rgba(19,36,70,0.12)] backdrop-blur-xl sm:p-8">
            <div className="flex flex-col gap-6 border-b border-slate-200/80 pb-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">Engineering workspace</p>
                <h3 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                  Explore the data, then move into design.
                </h3>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                  All existing analytics and the foundation design workflow remain available below, now presented after a clearer first-open narrative.
                </p>
              </div>

              <div className="rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-700">
                {loading
                  ? 'Loading geotechnical data...'
                  : `${stats?.total_samples ?? 0} samples · ${stats?.unique_boreholes ?? 0} boreholes · ${stats?.unique_locations ?? 0} sites`}
              </div>
            </div>

            {loading ? (
              <div className="flex h-64 items-center justify-center">
                <div className="text-center space-y-3">
                  <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-900 border-t-transparent" />
                  <p className="text-sm text-slate-500">Loading geotechnical data…</p>
                </div>
              </div>
            ) : (
              <Tabs value={activeTab} onValueChange={value => setActiveTab(value as TabValue)} className="space-y-6 pt-6">
                <div className="overflow-x-auto pb-2">
                  <TabsList className="h-auto min-w-max rounded-2xl border border-slate-200 bg-slate-50/90 p-1.5 shadow-sm">
                    {tabItems.map(item => {
                      const Icon = item.icon

                      return (
                        <TabsTrigger
                          key={item.value}
                          value={item.value}
                          className="rounded-xl px-4 py-3 data-[state=active]:bg-slate-950 data-[state=active]:text-white"
                        >
                          <Icon size={14} />
                          {item.label}
                        </TabsTrigger>
                      )
                    })}
                  </TabsList>
                </div>

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
          </div>
        </section>
      </main>
    </div>
  )
}
