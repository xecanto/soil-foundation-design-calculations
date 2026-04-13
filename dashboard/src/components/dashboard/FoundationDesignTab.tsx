'use client'

import FoundationDesignPanel from './FoundationDesignPanel'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Info } from 'lucide-react'

export default function FoundationDesignTab() {
  return (
    <div className="space-y-6">
      {/* Theory card */}
      <Card className="border-indigo-200 bg-indigo-50/50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2 text-indigo-700">
            <Info size={16} />
            Terzaghi's General Bearing Capacity Theory
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-indigo-800 space-y-2">
          <p>
            <strong>qu = c·Nc + q·Nq + 0.5·γ·B·Nγ</strong>
            &nbsp;— Ultimate bearing capacity of a square footing (kPa)
          </p>
          <ul className="list-disc list-inside space-y-1 text-indigo-700">
            <li><strong>c</strong> — Cohesion (kPa), averaged over soil layers up to depth H</li>
            <li><strong>q = γ·H</strong> — Surcharge from overburden (kPa)</li>
            <li><strong>γ</strong> — Unit weight (kN/m³), averaged over layers</li>
            <li><strong>B</strong> — Footing width (ft), solved from cubic equation given structural load</li>
            <li><strong>H</strong> — Foundation depth (ft), iterated at 3, 5, 7, 9, 11, 13, 15, 17, 19 ft</li>
            <li><strong>Nc, Nq, Nγ</strong> — Terzaghi bearing capacity factors from φ lookup table</li>
            <li><strong>qa = qu / 3</strong> — Allowable bearing capacity (factor of safety = 3)</li>
          </ul>
          <p className="text-xs text-indigo-600 mt-2">
            Valid results: 3 ft ≤ B ≤ 7 ft AND H/B ≤ 4. Soil properties are automatically looked up
            from the nearest borehole within Islamabad Zone 4.
          </p>
        </CardContent>
      </Card>

      <FoundationDesignPanel />
    </div>
  )
}
