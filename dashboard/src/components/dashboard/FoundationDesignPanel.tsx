'use client'

import { useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { postAPI } from '@/lib/api'
import { FoundationDesignResponse, LocationProperties, SoilLayer } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import FoundationResultsChart from '@/components/charts/FoundationResultsChart'
import { Calculator, MapPin, AlertCircle, CheckCircle2, Database, Layers, Play } from 'lucide-react'

const MapPicker = dynamic(() => import('./MapPicker'), {
  ssr: false,
  loading: () => (
    <div className="rounded-xl border border-border bg-muted/40 flex items-center justify-center" style={{ height: 420 }}>
      <p className="text-sm text-muted-foreground">Loading map…</p>
    </div>
  ),
})

const DEFAULT_LAYERS: SoilLayer[] = [
  { depth: 5,  n_value: 8,  cohesion: 18, unit_weight: 16, uscs: 'SILTY CLAY' },
  { depth: 10, n_value: 12, cohesion: 22, unit_weight: 17, uscs: 'SILTY CLAY' },
  { depth: 15, n_value: 18, cohesion: 28, unit_weight: 18, uscs: 'SILTY CLAY' },
  { depth: 20, n_value: 24, cohesion: 35, unit_weight: 18, uscs: 'SILTY CLAY' },
]

export default function FoundationDesignPanel() {
  const [lat, setLat]   = useState<string>('33.7113')
  const [lon, setLon]   = useState<string>('73.1966')
  const [load, setLoad] = useState<string>('500')

  const [layers, setLayers]           = useState<SoilLayer[]>(DEFAULT_LAYERS)
  const [dataSource, setDataSource]   = useState<'default' | 'database' | 'interpolation'>('default')
  const [sampleCount, setSampleCount] = useState<number>(0)

  const [loading, setLoading] = useState(false)
  const [result, setResult]   = useState<FoundationDesignResponse | null>(null)
  const [error, setError]     = useState<string | null>(null)

  const handleLocationSelect = useCallback((
    newLat: number, newLon: number, props: LocationProperties | null
  ) => {
    setLat(newLat.toFixed(6))
    setLon(newLon.toFixed(6))
    setResult(null)
    setError(null)
    if (props) {
      setLayers(props.layers)
      setDataSource(props.source)
      setSampleCount(props.sample_count)
    }
  }, [])

  function updateLayer(idx: number, field: keyof SoilLayer, value: string) {
    setLayers(prev =>
      prev.map((l, i) =>
        i === idx ? { ...l, [field]: field === 'uscs' ? value : parseFloat(value) || 0 } : l
      )
    )
  }

  function addLayer() {
    const lastDepth = layers[layers.length - 1]?.depth ?? 0
    setLayers(prev => [...prev, { depth: lastDepth + 5, n_value: 0, cohesion: 0, unit_weight: 17, uscs: 'SILTY CLAY' }])
  }

  function removeLayer(idx: number) {
    setLayers(prev => prev.filter((_, i) => i !== idx))
  }

  async function handleCalculate() {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const data = await postAPI<FoundationDesignResponse>('/foundation-design', {
        latitude: parseFloat(lat),
        longitude: parseFloat(lon),
        structural_load: parseFloat(load),
        layers,
      })
      setResult(data)
    } catch (e: any) {
      setError(e.message ?? 'Calculation failed')
    } finally {
      setLoading(false)
    }
  }

  const sourceMeta = {
    'default':       { text: 'Default values',                          cls: 'bg-muted text-muted-foreground' },
    'database':      { text: `Database  ·  ${sampleCount} samples`,     cls: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300' },
    'interpolation': { text: 'TIF interpolation',                        cls: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300' },
  }[dataSource]

  return (
    <div className="space-y-5">

      {/* MAP */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin size={16} className="text-indigo-500" />
            Select Location
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Click the map to auto-fill soil properties from the database or TIF interpolation.
          </p>
        </CardHeader>
        <CardContent>
          <MapPicker
            onLocationSelect={handleLocationSelect}
            selectedLat={parseFloat(lat) || null}
            selectedLon={parseFloat(lon) || null}
          />
        </CardContent>
      </Card>

      {/* INPUTS */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calculator size={16} className="text-indigo-500" />
            Foundation Inputs
            <Badge className={`ml-2 text-xs ${sourceMeta.cls}`}>
              {sourceMeta.text}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Lat / Lon / Load */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Latitude (°N)</label>
              <Input type="number" step="0.0001" value={lat} onChange={e => setLat(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Longitude (°E)</label>
              <Input type="number" step="0.0001" value={lon} onChange={e => setLon(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Structural Load (kN)</label>
              <Input type="number" value={load} onChange={e => setLoad(e.target.value)} />
            </div>
          </div>

          {/* Editable layers */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Soil Layers</span>
              <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={addLayer}>
                + Add Layer
              </Button>
            </div>
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-xs">Depth (ft)</TableHead>
                    <TableHead className="text-xs">N-Value</TableHead>
                    <TableHead className="text-xs">Cohesion (kPa)</TableHead>
                    <TableHead className="text-xs">Unit Wt (kN/m³)</TableHead>
                    <TableHead className="text-xs">USCS</TableHead>
                    <TableHead className="text-xs w-8" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {layers.map((layer, idx) => (
                    <TableRow key={idx} className="hover:bg-muted/30">
                      <TableCell className="py-1.5 pr-1">
                        <Input type="number" value={layer.depth} onChange={e => updateLayer(idx, 'depth', e.target.value)} className="h-7 text-xs" />
                      </TableCell>
                      <TableCell className="py-1.5 pr-1">
                        <Input type="number" value={layer.n_value} onChange={e => updateLayer(idx, 'n_value', e.target.value)} className="h-7 text-xs" />
                      </TableCell>
                      <TableCell className="py-1.5 pr-1">
                        <Input type="number" value={layer.cohesion} onChange={e => updateLayer(idx, 'cohesion', e.target.value)} className="h-7 text-xs" />
                      </TableCell>
                      <TableCell className="py-1.5 pr-1">
                        <Input type="number" step="0.1" value={layer.unit_weight} onChange={e => updateLayer(idx, 'unit_weight', e.target.value)} className="h-7 text-xs" />
                      </TableCell>
                      <TableCell className="py-1.5 pr-1">
                        <Input value={layer.uscs} onChange={e => updateLayer(idx, 'uscs', e.target.value)} className="h-7 text-xs" />
                      </TableCell>
                      <TableCell className="py-1.5">
                        <button
                          onClick={() => removeLayer(idx)}
                          disabled={layers.length <= 1}
                          className="text-muted-foreground hover:text-destructive text-xs"
                          title="Remove"
                        >✕</button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
            Coverage: Islamabad Zone 4 · Lat 33.66–33.76°N · Lon 73.10–73.29°E ·
            Iterations: H = 3, 5, 7…19 ft · Valid B: 3–7 ft · H/B ≤ 4
          </p>

          <Button
            onClick={handleCalculate}
            disabled={loading || layers.length === 0}
            size="lg"
            className="w-full bg-gradient-to-r from-indigo-500 to-indigo-700 hover:from-indigo-600 hover:to-indigo-800 font-semibold text-base gap-2"
          >
            <Play size={16} fill="currentColor" />
            {loading ? 'Calculating…' : 'Start Calculations'}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="py-4 flex items-center gap-3 text-destructive">
            <AlertCircle size={18} />
            <span className="text-sm">{error}</span>
          </CardContent>
        </Card>
      )}

      {result && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">φ = {result.phi}°</Badge>
            <Badge variant="secondary">Nc = {result.Nc}</Badge>
            <Badge variant="secondary">Nq = {result.Nq}</Badge>
            <Badge variant="secondary">Nγ = {result.N_gamma}</Badge>
            <Badge variant="secondary">q = {result.structural_load} kN</Badge>
            <Badge className="bg-emerald-500/20 text-emerald-700 border-emerald-200 dark:text-emerald-300">
              <CheckCircle2 size={12} className="mr-1" />
              {result.results.length} valid iterations
            </Badge>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Design Charts</CardTitle></CardHeader>
            <CardContent>
              <FoundationResultsChart data={result.results} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Iteration Results</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Iter.</TableHead>
                      <TableHead>H (ft)</TableHead>
                      <TableHead>Layer</TableHead>
                      <TableHead>γavg</TableHead>
                      <TableHead>cavg</TableHead>
                      <TableHead>Q (kN/m²)</TableHead>
                      <TableHead className="text-indigo-600 font-bold">B (ft)</TableHead>
                      <TableHead>H/B</TableHead>
                      <TableHead>qu (kPa)</TableHead>
                      <TableHead>qa (kPa)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.results.map(r => (
                      <TableRow key={r.iteration}>
                        <TableCell>{r.iteration}</TableCell>
                        <TableCell>{r.H_ft}</TableCell>
                        <TableCell>{r.layer_no}</TableCell>
                        <TableCell>{r.gamma_avg}</TableCell>
                        <TableCell>{r.c_avg}</TableCell>
                        <TableCell>{r.Q_surcharge}</TableCell>
                        <TableCell className="font-bold text-indigo-600">{r.B_ft}</TableCell>
                        <TableCell>{r.H_over_B}</TableCell>
                        <TableCell>{r.qu_kPa}</TableCell>
                        <TableCell className="font-semibold text-emerald-600">{r.qa_kPa}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
