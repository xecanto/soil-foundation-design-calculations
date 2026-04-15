'use client'

import { useCallback, useEffect, useState } from 'react'
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
import FoundationResultsSection from './FoundationResultsSection'
import { generateFoundationReportPdf } from '@/lib/foundation-report'
import { AlertCircle, Calculator, CheckCircle2, FileText, Info, MapPin, Play } from 'lucide-react'

const MapPicker = dynamic(() => import('./MapPicker'), {
  ssr: false,
  loading: () => (
    <div className="rounded-xl border border-border bg-muted/40 flex items-center justify-center" style={{ height: 420 }}>
      <p className="text-sm text-muted-foreground">Loading map…</p>
    </div>
  ),
})

type CoverageMode = 'unselected' | 'database' | 'interpolation' | 'manual'

interface EditableSoilLayer {
  depth: string
  n_value: string
  cohesion: string
  unit_weight: string
  uscs: string
  friction_angle: string
}

const EMPTY_LAYER: EditableSoilLayer = {
  depth: '',
  n_value: '',
  cohesion: '',
  unit_weight: '',
  uscs: '',
  friction_angle: '',
}

function toEditableLayer(layer: SoilLayer): EditableSoilLayer {
  return {
    depth: String(layer.depth),
    n_value: String(layer.n_value),
    cohesion: String(layer.cohesion),
    unit_weight: String(layer.unit_weight),
    uscs: layer.uscs ?? '',
    friction_angle: layer.friction_angle != null ? String(layer.friction_angle) : '',
  }
}

function isNumericValue(value: string) {
  return value.trim() !== '' && !Number.isNaN(Number(value))
}

function hasCompleteNumbers(layer: EditableSoilLayer, requireFrictionAngle = false) {
  return isNumericValue(layer.depth)
    && isNumericValue(layer.n_value)
    && isNumericValue(layer.cohesion)
    && isNumericValue(layer.unit_weight)
    && (!requireFrictionAngle || isNumericValue(layer.friction_angle))
}

function toPayloadLayers(layers: EditableSoilLayer[], requireFrictionAngle: boolean): SoilLayer[] {
  return layers
    .filter(layer => hasCompleteNumbers(layer, requireFrictionAngle))
    .map(layer => ({
      depth: Number(layer.depth),
      n_value: Number(layer.n_value),
      cohesion: Number(layer.cohesion),
      unit_weight: Number(layer.unit_weight),
      uscs: layer.uscs.trim(),
      friction_angle: isNumericValue(layer.friction_angle) ? Number(layer.friction_angle) : undefined,
    }))
}

function formatCoverageText(mode: CoverageMode, sampleCount: number) {
  switch (mode) {
    case 'database':
      return `Database data · ${sampleCount} samples`
    case 'interpolation':
      return 'Interpolated region'
    case 'manual':
      return 'Manual entry required'
    default:
      return 'Location required'
  }
}

function createNextLayer(layers: EditableSoilLayer[]) {
  const lastDepth = layers[layers.length - 1]?.depth
  const nextDepth = isNumericValue(lastDepth ?? '') ? String(Number(lastDepth) + 5) : ''
  return {
    ...EMPTY_LAYER,
    depth: nextDepth,
  }
}

function ModalShell({
  open,
  title,
  description,
  children,
  footer,
}: {
  open: boolean
  title: string
  description?: string
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-80 flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm">
      <div className="w-full max-w-4xl rounded-3xl border border-white/60 bg-white shadow-2xl">
        <div className="border-b border-slate-200 px-6 py-5">
          <h3 className="text-xl font-semibold tracking-tight text-slate-950">{title}</h3>
          {description && <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>}
        </div>
        <div className="px-6 py-5">{children}</div>
        {footer && <div className="border-t border-slate-200 px-6 py-4">{footer}</div>}
      </div>
    </div>
  )
}

export default function FoundationDesignPanel() {
  const [lat, setLat] = useState<string>('')
  const [lon, setLon] = useState<string>('')
  const [load, setLoad] = useState<string>('')
  const [groundwaterDepth, setGroundwaterDepth] = useState<string>('')

  const [layers, setLayers] = useState<EditableSoilLayer[]>([])
  const [coverageMode, setCoverageMode] = useState<CoverageMode>('unselected')
  const [sampleCount, setSampleCount] = useState<number>(0)
  const [showLocationModal, setShowLocationModal] = useState(true)
  const [showLoadModal, setShowLoadModal] = useState(false)
  const [showManualGuidanceModal, setShowManualGuidanceModal] = useState(false)
  const [showManualDetailsModal, setShowManualDetailsModal] = useState(false)
  const [panelVisible, setPanelVisible] = useState(false)
  const [manualPrompted, setManualPrompted] = useState(false)

  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<FoundationDesignResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reportLoading, setReportLoading] = useState(false)

  const hasSelectedLocation = lat !== '' && lon !== ''
  const requiresManualFriction = coverageMode === 'manual'
  const numericLayers = toPayloadLayers(layers, requiresManualFriction)
  const canCalculate = hasSelectedLocation
    && numericLayers.length > 0
    && isNumericValue(load)
    && (coverageMode !== 'manual' || isNumericValue(groundwaterDepth))

  useEffect(() => {
    if (coverageMode !== 'manual' || !panelVisible) return

    const allRowsComplete = layers.length > 0 && layers.every(layer => hasCompleteNumbers(layer, true))
    if (!allRowsComplete) {
      setManualPrompted(false)
      return
    }

    if (!manualPrompted && !isNumericValue(load) && !isNumericValue(groundwaterDepth)) {
      setShowManualDetailsModal(true)
      setManualPrompted(true)
    }
  }, [coverageMode, groundwaterDepth, layers, load, manualPrompted, panelVisible])

  const handleLocationSelect = useCallback((
    newLat: number, newLon: number, props: LocationProperties | null
  ) => {
    setLat(newLat.toFixed(6))
    setLon(newLon.toFixed(6))
    setResult(null)
    setError(null)

    if (props) {
      setLayers(props.layers.map(toEditableLayer))
      setCoverageMode(props.source)
      setSampleCount(props.sample_count)
      setGroundwaterDepth('')
      setLoad('')
      setShowLocationModal(false)
      setShowManualGuidanceModal(false)
      setShowManualDetailsModal(false)
      setPanelVisible(false)
      setManualPrompted(false)
      setShowLoadModal(true)
      return
    }

    setCoverageMode('manual')
    setLayers([{ ...EMPTY_LAYER }])
    setSampleCount(0)
    setGroundwaterDepth('')
    setLoad('')
    setShowLocationModal(false)
    setShowLoadModal(false)
    setShowManualGuidanceModal(true)
    setShowManualDetailsModal(false)
    setPanelVisible(true)
    setManualPrompted(false)
  }, [])

  function updateLayer(idx: number, field: keyof EditableSoilLayer, value: string) {
    setLayers(prev =>
      prev.map((l, i) =>
        i === idx ? { ...l, [field]: value } : l
      )
    )
  }

  function addLayer() {
    setLayers(prev => [...prev, createNextLayer(prev)])
  }

  function removeLayer(idx: number) {
    setLayers(prev => prev.filter((_, i) => i !== idx))
  }

  function resetFoundationFlow() {
    setLat('')
    setLon('')
    setLoad('')
    setGroundwaterDepth('')
    setLayers([])
    setCoverageMode('unselected')
    setSampleCount(0)
    setResult(null)
    setError(null)
    setReportLoading(false)
    setPanelVisible(false)
    setShowLoadModal(false)
    setShowManualGuidanceModal(false)
    setShowManualDetailsModal(false)
    setManualPrompted(false)
    setShowLocationModal(true)
  }

  function confirmStructuralLoad() {
    if (!isNumericValue(load)) {
      setError('Enter a valid structural load before continuing.')
      return
    }
    setError(null)
    setPanelVisible(true)
    setShowLoadModal(false)
  }

  function confirmManualDetails() {
    if (!isNumericValue(load) || !isNumericValue(groundwaterDepth)) {
      setError('Enter both structural load and groundwater table depth to continue.')
      return
    }
    setError(null)
    setShowManualDetailsModal(false)
  }

  async function handleCalculate() {
    if (!canCalculate) {
      setError('Complete the required location, layer, load, and groundwater details before calculating.')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const data = await postAPI<FoundationDesignResponse>('/foundation-design', {
        latitude: parseFloat(lat),
        longitude: parseFloat(lon),
        structural_load: parseFloat(load),
        layers: numericLayers,
      })
      setResult(data)
    } catch (e: any) {
      setError(e.message ?? 'Calculation failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleGenerateReport() {
    if (!result) return

    setReportLoading(true)
    try {
      await generateFoundationReportPdf({
        latitude: lat,
        longitude: lon,
        coverageLabel: sourceMeta.text,
        groundwaterLabel,
        structuralLoad: load,
        terzaghiResults: result.terzaghi_results,
        generalResults: result.general_results,
      })
    } catch (reportError: any) {
      setError(reportError?.message ?? 'Unable to generate the geotechnical report PDF.')
    } finally {
      setReportLoading(false)
    }
  }

  const sourceMeta = {
    text: formatCoverageText(coverageMode, sampleCount),
    cls: coverageMode === 'database'
      ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
      : coverageMode === 'interpolation'
        ? 'bg-blue-100 text-blue-700 border-blue-200'
        : coverageMode === 'manual'
          ? 'bg-amber-100 text-amber-800 border-amber-200'
          : 'bg-muted text-muted-foreground',
  }

  const groundwaterLabel = coverageMode === 'manual'
    ? (isNumericValue(groundwaterDepth) ? `${groundwaterDepth} ft from top` : 'Awaiting user entry')
    : coverageMode === 'unselected'
      ? 'Select a location first'
      : 'No water table encountered'

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin size={16} className="text-indigo-500" />
                Foundation Design Workflow
                <Badge className={`ml-2 text-xs border ${sourceMeta.cls}`}>
                  {sourceMeta.text}
                </Badge>
              </CardTitle>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Start by selecting a location on the map. The system will either auto-fill soil values from the database/interpolation region or switch you to manual entry if the location is outside coverage.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowLocationModal(true)}>
                {hasSelectedLocation ? 'Change Location' : 'Select Location on Map'}
              </Button>
              {hasSelectedLocation && (
                <Button variant="ghost" onClick={resetFoundationFlow}>
                  Reset
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Selected coordinates</p>
              <p className="mt-2 text-sm font-medium text-foreground">
                {hasSelectedLocation ? `${lat}°N, ${lon}°E` : 'No location selected yet'}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Coverage status</p>
              <p className="mt-2 text-sm font-medium text-foreground">{sourceMeta.text}</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Groundwater</p>
              <p className="mt-2 text-sm font-medium text-foreground">{groundwaterLabel}</p>
            </div>
          </div>

          {!hasSelectedLocation && (
            <div className="rounded-xl border border-dashed border-indigo-300 bg-indigo-50/70 px-4 py-4 text-sm text-indigo-900">
              Select a location on the map to begin foundation design input.
            </div>
          )}

          {hasSelectedLocation && !panelVisible && coverageMode !== 'manual' && (
            <div className="rounded-xl border border-blue-200 bg-blue-50/70 px-4 py-4 text-sm text-blue-900">
              The selected location is inside the available coverage region. Enter structural load in the popup to reveal the editable foundation input table.
            </div>
          )}

          {hasSelectedLocation && panelVisible && (
            <Card className="border-border/80 shadow-none">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Calculator size={16} className="text-indigo-500" />
                  Foundation Inputs
                  <Badge className={`ml-2 text-xs border ${sourceMeta.cls}`}>
                    {sourceMeta.text}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-1">
                    <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Latitude (°N)</label>
                    <Input value={lat} readOnly />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Longitude (°E)</label>
                    <Input value={lon} readOnly />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Structural Load (kN)</label>
                    <Input type="number" value={load} onChange={e => setLoad(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Groundwater Table</label>
                    {coverageMode === 'manual' ? (
                      <Input
                        type="number"
                        placeholder="Depth from top (ft)"
                        value={groundwaterDepth}
                        onChange={e => setGroundwaterDepth(e.target.value)}
                      />
                    ) : (
                      <Input value="No water table encountered" readOnly />
                    )}
                  </div>
                </div>

                {coverageMode === 'manual' && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
                    <div className="flex items-start gap-3">
                      <Info size={16} className="mt-0.5 shrink-0" />
                      <p>
                        Enter all soil values manually for this out-of-coverage location, including the friction angle for each layer. For the <strong>Unit Weight (kN/m3)</strong> column, use submerged unit weight beneath the water table and dry unit weight above the water table.
                      </p>
                    </div>
                  </div>
                )}

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Soil Layers</span>
                    <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={addLayer}>
                      + Add Layer
                    </Button>
                  </div>
                  <div className="overflow-auto rounded-lg border border-border">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="text-xs">Depth (ft)</TableHead>
                          <TableHead className="text-xs">N-Value</TableHead>
                          <TableHead className="text-xs">Cohesion (kPa)</TableHead>
                          <TableHead className="text-xs">Unit Weight (kN/m3)</TableHead>
                          {coverageMode === 'manual' && <TableHead className="text-xs">Friction Angle (°)</TableHead>}
                          <TableHead className="text-xs">USCS</TableHead>
                          <TableHead className="w-8 text-xs" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {layers.map((layer, idx) => (
                          <TableRow key={idx} className="hover:bg-muted/30">
                            <TableCell className="py-1.5 pr-1">
                              <Input type="number" value={layer.depth} onChange={e => updateLayer(idx, 'depth', e.target.value)} className="h-7 text-xs" />
                            </TableCell>
                            <TableCell className="py-1.5 pr-1">
                              <Input type="number" value={layer.n_value} onChange={e => updateLayer(idx, 'n_value', e.target.value)} className="h-7 w-20 text-xs" />
                            </TableCell>
                            <TableCell className="py-1.5 pr-1">
                              <Input type="number" value={layer.cohesion} onChange={e => updateLayer(idx, 'cohesion', e.target.value)} className="h-7 w-24 text-xs" />
                            </TableCell>
                            <TableCell className="py-1.5 pr-1">
                              <Input type="number" step="0.1" value={layer.unit_weight} onChange={e => updateLayer(idx, 'unit_weight', e.target.value)} className="h-7 w-24 text-xs" />
                            </TableCell>
                            {coverageMode === 'manual' && (
                              <TableCell className="py-1.5 pr-1">
                                <Input type="number" step="0.1" value={layer.friction_angle} onChange={e => updateLayer(idx, 'friction_angle', e.target.value)} className="h-7 w-24 text-xs" />
                              </TableCell>
                            )}
                            <TableCell className="py-1.5 pr-1">
                              <Input value={layer.uscs} onChange={e => updateLayer(idx, 'uscs', e.target.value)} className="h-7 w-32 text-xs" />
                            </TableCell>
                            <TableCell className="py-1.5">
                              <button
                                onClick={() => removeLayer(idx)}
                                disabled={layers.length <= 1}
                                className="text-xs text-muted-foreground hover:text-destructive disabled:opacity-30"
                                title="Remove"
                              >✕</button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {coverageMode === 'manual' && layers.length > 0 && layers.every(layer => hasCompleteNumbers(layer, true)) && (!isNumericValue(load) || !isNumericValue(groundwaterDepth)) && (
                  <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-4 text-sm text-blue-900">
                    Manual layer entry is complete. Continue with the required structural load and groundwater depth popup before calculating.
                    <div className="mt-3">
                      <Button size="sm" onClick={() => setShowManualDetailsModal(true)}>
                        Enter Required Details
                      </Button>
                    </div>
                  </div>
                )}

                <p className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                  Coverage: Islamabad Zone 4 · Lat 33.66–33.76°N · Lon 73.10–73.29°E · Iterations: H = 3, 5, 7…19 ft · Valid B: 3–20 ft · H/B ≤ 4
                </p>

                <Button
                  onClick={handleCalculate}
                  disabled={loading || !canCalculate}
                  size="lg"
                  className="w-full gap-2 bg-linear-to-r from-indigo-500 to-indigo-700 font-semibold text-base hover:from-indigo-600 hover:to-indigo-800"
                >
                  <Play size={16} fill="currentColor" />
                  {loading ? 'Calculating…' : 'Start Calculations'}
                </Button>
              </CardContent>
            </Card>
          )}
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
          <Card className="border-indigo-200/60 bg-indigo-50/40 dark:bg-indigo-900/10">
            <CardContent className="py-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">
                Design Summary
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">Load = {result.structural_load} kN</Badge>
                <Badge variant="secondary">Groundwater = {groundwaterLabel}</Badge>
                <Badge className="bg-emerald-500/20 text-emerald-700 border-emerald-200 dark:text-emerald-300">
                  <CheckCircle2 size={12} className="mr-1" />
                  {result.terzaghi_results.length} Terzaghi iteration{result.terzaghi_results.length !== 1 ? 's' : ''}
                </Badge>
                <Badge className="border-cyan-200 bg-cyan-500/20 text-cyan-700 dark:text-cyan-300">
                  <CheckCircle2 size={12} className="mr-1" />
                  {result.general_results.length} General iteration{result.general_results.length !== 1 ? 's' : ''}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <FoundationResultsSection
            title="Terzaghi Bearing Capacity"
            description="Weighted average friction angle is applied per depth iteration for manual-entry layers before selecting Terzaghi bearing factors from the table."
            data={result.terzaghi_results}
            mode="terzaghi"
          />

          <FoundationResultsSection
            title="General Bearing Capacity"
            description="General bearing capacity output uses the weighted friction angle, the provided General Bearing Capacity table, and the requested shape/depth/inclination factors."
            data={result.general_results}
            mode="general"
          />

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Generate Geotechnical Report</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Create and open a PDF report for the current foundation design scenario.
              </p>
            </CardHeader>
            <CardContent>
              <Button onClick={handleGenerateReport} disabled={reportLoading} className="gap-2">
                <FileText size={16} />
                {reportLoading ? 'Generating PDF…' : 'Generate Geotechnical Report PDF'}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      <ModalShell
        open={showLocationModal}
        title="Select location on map"
        description="Choose the project location first. The system will check whether the point falls inside the database/interpolated region and then guide the next input step automatically."
        footer={
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setShowLocationModal(false)}>
              Close
            </Button>
          </div>
        }
      >
        <MapPicker
          onLocationSelect={handleLocationSelect}
          selectedLat={lat ? parseFloat(lat) : null}
          selectedLon={lon ? parseFloat(lon) : null}
        />
      </ModalShell>

      <ModalShell
        open={showLoadModal}
        title="Enter structural load"
        description="The selected location is inside the available region. Enter structural load first, then the editable foundation inputs table will appear with auto-filled soil values."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowLoadModal(false)}>
              Later
            </Button>
            <Button onClick={confirmStructuralLoad}>
              Continue to Inputs
            </Button>
          </div>
        }
      >
        <div className="max-w-sm space-y-2">
          <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Structural Load (kN)</label>
          <Input type="number" value={load} onChange={e => setLoad(e.target.value)} placeholder="Enter load" />
        </div>
      </ModalShell>

      <ModalShell
        open={showManualGuidanceModal}
        title="Manual data entry required"
        description="This selected point falls outside the database/interpolated coverage region, so the foundation input table will remain empty and must be filled manually."
        footer={
          <div className="flex justify-end">
            <Button onClick={() => setShowManualGuidanceModal(false)}>
              Continue to Manual Inputs
            </Button>
          </div>
        }
      >
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-6 text-amber-900">
          Enter all layer values manually, including friction angle for each layer. For the <strong>Unit Weight (kN/m3)</strong> column, use submerged unit weight beneath the water table and dry unit weight above the water table. After you complete the layer table, the system will ask for structural load and groundwater table depth from the top.
        </div>
      </ModalShell>

      <ModalShell
        open={showManualDetailsModal}
        title="Enter structural load and groundwater depth"
        description="Manual layer values are ready. Enter these final required details. Groundwater table depth is for output display only and does not affect calculations."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowManualDetailsModal(false)}>
              Later
            </Button>
            <Button onClick={confirmManualDetails}>
              Save Details
            </Button>
          </div>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Structural Load (kN)</label>
            <Input type="number" value={load} onChange={e => setLoad(e.target.value)} placeholder="Enter load" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Groundwater Table Depth (ft from top)</label>
            <Input type="number" value={groundwaterDepth} onChange={e => setGroundwaterDepth(e.target.value)} placeholder="Enter depth" />
          </div>
        </div>
      </ModalShell>
    </div>
  )
}
