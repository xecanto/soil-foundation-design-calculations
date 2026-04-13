'use client'

import { LocationStat } from '@/types'
import GeoScatterMap from '@/components/charts/GeoScatterMap'
import LocationComparisonChart from '@/components/charts/LocationComparisonChart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MapPin } from 'lucide-react'

interface Props {
  locations: LocationStat[]
}

export default function GeographicTab({ locations }: Props) {
  return (
    <div className="space-y-6">
      {/* Geo scatter */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin size={16} className="text-indigo-500" />
            Geographic Distribution — Islamabad Zone 4
          </CardTitle>
        </CardHeader>
        <CardContent>
          <GeoScatterMap data={locations} />
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Dot size = sample count · Color intensity = average N-value
          </p>
        </CardContent>
      </Card>

      {/* Top locations bar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top Locations by Sample Count</CardTitle>
        </CardHeader>
        <CardContent>
          <LocationComparisonChart data={locations} />
        </CardContent>
      </Card>

      {/* Locations table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Surveyed Locations ({locations.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-background">
                <tr className="border-b">
                  <th className="text-left py-2 px-3 font-semibold text-muted-foreground">#</th>
                  <th className="text-right py-2 px-3 font-semibold text-muted-foreground">Latitude</th>
                  <th className="text-right py-2 px-3 font-semibold text-muted-foreground">Longitude</th>
                  <th className="text-right py-2 px-3 font-semibold text-muted-foreground">Samples</th>
                  <th className="text-right py-2 px-3 font-semibold text-muted-foreground">Avg N</th>
                  <th className="text-right py-2 px-3 font-semibold text-muted-foreground">Min N</th>
                  <th className="text-right py-2 px-3 font-semibold text-muted-foreground">Max N</th>
                  <th className="text-right py-2 px-3 font-semibold text-muted-foreground">Avg c (kPa)</th>
                  <th className="text-right py-2 px-3 font-semibold text-muted-foreground">Avg γ (kN/m³)</th>
                  <th className="py-2 px-3 font-semibold text-muted-foreground">Soil Types</th>
                </tr>
              </thead>
              <tbody>
                {locations.map((loc, i) => (
                  <tr key={`${loc.latitude}-${loc.longitude}`} className="border-b hover:bg-muted/40 transition-colors">
                    <td className="py-2 px-3 text-muted-foreground">{i + 1}</td>
                    <td className="py-2 px-3 text-right font-mono text-xs">{loc.latitude.toFixed(4)}</td>
                    <td className="py-2 px-3 text-right font-mono text-xs">{loc.longitude.toFixed(4)}</td>
                    <td className="py-2 px-3 text-right font-semibold">{loc.sample_count}</td>
                    <td className="py-2 px-3 text-right text-indigo-600 font-semibold">{loc.avg_n}</td>
                    <td className="py-2 px-3 text-right">{loc.min_n}</td>
                    <td className="py-2 px-3 text-right">{loc.max_n}</td>
                    <td className="py-2 px-3 text-right">{loc.avg_cohesion}</td>
                    <td className="py-2 px-3 text-right">{loc.avg_unit_weight}</td>
                    <td className="py-2 px-3">
                      <div className="flex flex-wrap gap-1">
                        {(loc.soil_types ?? []).slice(0, 3).map(st => (
                          <Badge key={st} variant="outline" className="text-xs font-mono py-0">{st}</Badge>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
