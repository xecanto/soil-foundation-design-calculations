'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { fetchAPI, API_BASE } from '@/lib/api'
import { LocationProperties, RasterBounds } from '@/types'

// ---------- leaflet types (loaded lazily) ----------
type LMap = import('leaflet').Map
type LMarker = import('leaflet').Marker
type LImageOverlay = import('leaflet').ImageOverlay
type LGeoJSON = import('leaflet').GeoJSON

const DEPTHS = [5, 10, 15, 20] as const
const VARIABLES = [
  { key: 'n', label: 'N-Value', unit: '' },
  { key: 'c', label: 'Cohesion', unit: 'kPa' },
  { key: 'u', label: 'Unit Weight', unit: 'kN/m³' },
] as const

const USCS_COLORS: Record<string, string> = {
  'SILTY CLAY':      '#f59e0b',
  'CLAY':            '#ef4444',
  'SANDY CLAY':      '#f97316',
  'CLAYEY SAND':     '#84cc16',
  'SILTY SAND':      '#22c55e',
  'SAND':            '#10b981',
  'GRAVEL':          '#06b6d4',
  'SHALE':           '#6366f1',
  'ROCK':            '#8b5cf6',
}
const DEFAULT_COLOR = '#94a3b8'

interface Props {
  onLocationSelect: (lat: number, lon: number, props: LocationProperties | null) => void
  selectedLat: number | null
  selectedLon: number | null
}

export default function MapPicker({ onLocationSelect, selectedLat, selectedLon }: Props) {
  const mapRef      = useRef<LMap | null>(null)
  const markerRef   = useRef<LMarker | null>(null)
  const overlayRef  = useRef<LImageOverlay | null>(null)
  const voronoiRef  = useRef<LGeoJSON | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [depth, setDepth]       = useState<number>(5)
  const [rasterVar, setRasterVar] = useState<'n' | 'c' | 'u'>('n')
  const [showRaster, setShowRaster]   = useState(true)
  const [showVoronoi, setShowVoronoi] = useState(true)
  const [bounds, setBounds] = useState<RasterBounds | null>(null)
  const [mapReady, setMapReady] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [status, setStatus]     = useState<string>('')

  // ---- initialise map once ----
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return

    let destroyed = false
    let L: typeof import('leaflet')
    ;(async () => {
      L = (await import('leaflet')).default
      await import('leaflet/dist/leaflet.css')

      // Bail if StrictMode cleanup already ran while awaiting imports
      if (destroyed || !containerRef.current) return

      // Fix default icon paths broken by webpack
      // @ts-ignore
      delete L.Icon.Default.prototype._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      const map = L.map(containerRef.current!, {
        center: [33.7113, 73.1966],
        zoom: 13,
        zoomControl: true,
      })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map)

      // Click handler
      map.on('click', async (e) => {
        const { lat, lng } = e.latlng
        placeMarker(L, map, lat, lng)
        setLoading(true)
        setStatus('Loading location data…')
        try {
          const props = await fetchAPI<LocationProperties>(
            `/location-properties?lat=${lat.toFixed(6)}&lon=${lng.toFixed(6)}`
          )
          onLocationSelect(lat, lng, props)
          setStatus(
            props.source === 'database'
              ? `DB: ${props.sample_count} samples · ${props.layers.length} depths`
              : `Interpolated: ${props.layers.length} depth layers`
          )
        } catch {
          onLocationSelect(lat, lng, null)
          setStatus('Outside coverage area — enter values manually')
        } finally {
          setLoading(false)
        }
      })

      mapRef.current = map
      setMapReady(true)

      // Fetch bounds then load overlays
      try {
        const b = await fetchAPI<RasterBounds>('/raster-bounds')
        setBounds(b)
      } catch { /* ignore */ }
    })()

    return () => {
      destroyed = true
      setMapReady(false)
      mapRef.current?.remove()
      mapRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---- move marker when lat/lon props change externally ----
  useEffect(() => {
    if (!mapRef.current || selectedLat == null || selectedLon == null) return
    ;(async () => {
      const L = (await import('leaflet')).default
      placeMarker(L, mapRef.current!, selectedLat, selectedLon)
      mapRef.current!.panTo([selectedLat, selectedLon])
    })()
  }, [selectedLat, selectedLon])

  // ---- raster overlay ----
  useEffect(() => {
    if (!mapReady || !mapRef.current || !bounds) return
    ;(async () => {
      const L = (await import('leaflet')).default
      if (overlayRef.current) {
        overlayRef.current.remove()
        overlayRef.current = null
      }
      if (!showRaster) return
      const url = `${API_BASE}/raster-image?var=${rasterVar}&depth=${depth}&_=${Date.now()}`
      const leafletBounds = L.latLngBounds(
        [bounds.south, bounds.west],
        [bounds.north, bounds.east]
      )
      const overlay = L.imageOverlay(url, leafletBounds, { opacity: 0.55 })
      overlay.addTo(mapRef.current!)
      overlayRef.current = overlay
    })()
  }, [depth, rasterVar, showRaster, bounds, mapReady])

  // ---- Voronoi GeoJSON layer ----
  useEffect(() => {
    if (!mapReady || !mapRef.current) return
    ;(async () => {
      const L = (await import('leaflet')).default
      if (voronoiRef.current) {
        voronoiRef.current.remove()
        voronoiRef.current = null
      }
      if (!showVoronoi) return
      try {
        const resp = await fetchAPI<GeoJSON.FeatureCollection>(`/voronoi?depth=${depth}`)
        const layer = L.geoJSON(resp as any, {
          style: (feature) => {
            const uscs = feature?.properties?.uscs || ''
            return {
              fillColor: USCS_COLORS[uscs] ?? DEFAULT_COLOR,
              fillOpacity: 0.3,
              color: USCS_COLORS[uscs] ?? DEFAULT_COLOR,
              weight: 1.2,
              opacity: 0.7,
            }
          },
          onEachFeature: (feature, layer) => {
            const p = feature.properties || {}
            layer.bindTooltip(
              `<strong>${p.uscs || 'Unknown'}</strong><br/>
               N = ${p.n_value ?? '—'} &nbsp;|&nbsp; C = ${p.cohesion ?? '—'} kPa<br/>
               γ = ${p.unit_weight ?? '—'} kN/m³`,
              { sticky: true, className: 'voronoi-tip' }
            )
          },
        })
        layer.addTo(mapRef.current!)
        voronoiRef.current = layer
      } catch { /* shapefile may not exist for all depths */ }
    })()
  }, [depth, showVoronoi, mapReady])

  function placeMarker(L: typeof import('leaflet'), map: LMap, lat: number, lng: number) {
    if (markerRef.current) markerRef.current.remove()
    markerRef.current = L.marker([lat, lng]).addTo(map)
    markerRef.current.bindPopup(`<b>Selected</b><br/>Lat: ${lat.toFixed(5)}<br/>Lon: ${lng.toFixed(5)}`).openPopup()
  }

  return (
    <div className="space-y-3">
      {/* Controls bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Depth */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">Depth:</span>
          <div className="flex gap-1">
            {DEPTHS.map(d => (
              <button
                key={d}
                onClick={() => setDepth(d)}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                  depth === d
                    ? 'bg-indigo-600 text-white'
                    : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                }`}
              >
                {d} ft
              </button>
            ))}
          </div>
        </div>

        {/* Variable */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">Layer:</span>
          <div className="flex gap-1">
            {VARIABLES.map(v => (
              <button
                key={v.key}
                onClick={() => setRasterVar(v.key as 'n' | 'c' | 'u')}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                  rasterVar === v.key
                    ? 'bg-indigo-600 text-white'
                    : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>

        {/* Toggle overlays */}
        <div className="flex items-center gap-3 ml-auto">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={showRaster}
              onChange={e => setShowRaster(e.target.checked)}
              className="w-3.5 h-3.5 accent-indigo-600"
            />
            <span className="text-xs text-muted-foreground">Raster</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={showVoronoi}
              onChange={e => setShowVoronoi(e.target.checked)}
              className="w-3.5 h-3.5 accent-indigo-600"
            />
            <span className="text-xs text-muted-foreground">Voronoi</span>
          </label>
        </div>
      </div>

      {/* USCS color legend */}
      {showVoronoi && (
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {Object.entries(USCS_COLORS).map(([label, color]) => (
            <span key={label} className="flex items-center gap-1 text-xs text-muted-foreground">
              <span className="inline-block w-3 h-3 rounded-sm" style={{ background: color, opacity: 0.75 }} />
              {label}
            </span>
          ))}
        </div>
      )}

      {/* Map container */}
      <div className="relative rounded-xl overflow-hidden border border-border" style={{ height: 420 }}>
        <div ref={containerRef} style={{ height: '100%', width: '100%' }} />

        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 bg-background/60 flex items-center justify-center z-[1000] pointer-events-none">
            <div className="bg-card px-4 py-2 rounded-lg shadow text-sm font-medium text-foreground">
              Loading…
            </div>
          </div>
        )}
      </div>

      {/* Status bar */}
      {status && (
        <p className="text-xs text-muted-foreground px-1">{status}</p>
      )}
      <p className="text-xs text-muted-foreground/60 px-1">
        Click anywhere on the map to select a location and auto-fill soil properties.
      </p>
    </div>
  )
}
