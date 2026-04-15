'use client'

import { FoundationResult } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import FoundationResultsChart from '@/components/charts/FoundationResultsChart'

interface Props {
  title: string
  description: string
  data: FoundationResult[]
  mode: 'terzaghi' | 'general'
}

export default function FoundationResultsSection({ title, description, data, mode }: Props) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-dashed border-border bg-muted/40 px-4 py-5 text-sm text-muted-foreground">
            No valid iterations were produced for this method under the current inputs.
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{title} Charts</CardTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        </CardHeader>
        <CardContent>
          <FoundationResultsChart data={data} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{title} Iteration Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="text-xs">
                  <TableHead>#</TableHead>
                  <TableHead>H (ft)</TableHead>
                  <TableHead>H (m)</TableHead>
                  <TableHead>Layer</TableHead>
                  <TableHead>φavg (°)</TableHead>
                  <TableHead>Nc</TableHead>
                  <TableHead>Nq</TableHead>
                  <TableHead>Nγ</TableHead>
                  {mode === 'general' && <TableHead>sc</TableHead>}
                  {mode === 'general' && <TableHead>sq</TableHead>}
                  {mode === 'general' && <TableHead>sγ</TableHead>}
                  {mode === 'general' && <TableHead>dc</TableHead>}
                  {mode === 'general' && <TableHead>dq</TableHead>}
                  <TableHead>γavg<br /><span className="font-normal text-muted-foreground">(kN/m³)</span></TableHead>
                  <TableHead>cavg<br /><span className="font-normal text-muted-foreground">(kPa)</span></TableHead>
                  <TableHead>Q<br /><span className="font-normal text-muted-foreground">(kN/m²)</span></TableHead>
                  <TableHead className="font-bold text-indigo-600">B (ft)</TableHead>
                  <TableHead>B (m)</TableHead>
                  <TableHead>H/B</TableHead>
                  <TableHead>qu<br /><span className="font-normal text-muted-foreground">(kPa)</span></TableHead>
                  <TableHead className="text-emerald-600">qa<br /><span className="font-normal text-muted-foreground">(kPa)</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map(row => (
                  <TableRow key={`${mode}-${row.iteration}`} className="text-xs hover:bg-muted/30">
                    <TableCell>{row.iteration}</TableCell>
                    <TableCell>{row.H_ft}</TableCell>
                    <TableCell>{row.H_m}</TableCell>
                    <TableCell>{row.layer_no}</TableCell>
                    <TableCell>{row.phi}</TableCell>
                    <TableCell>{row.Nc}</TableCell>
                    <TableCell>{row.Nq}</TableCell>
                    <TableCell>{row.N_gamma}</TableCell>
                    {mode === 'general' && <TableCell>{row.shape_c ?? '—'}</TableCell>}
                    {mode === 'general' && <TableCell>{row.shape_q ?? '—'}</TableCell>}
                    {mode === 'general' && <TableCell>{row.shape_gamma ?? '—'}</TableCell>}
                    {mode === 'general' && <TableCell>{row.depth_c ?? '—'}</TableCell>}
                    {mode === 'general' && <TableCell>{row.depth_q ?? '—'}</TableCell>}
                    <TableCell>{row.gamma_avg}</TableCell>
                    <TableCell>{row.c_avg}</TableCell>
                    <TableCell>{row.Q_surcharge}</TableCell>
                    <TableCell className="font-bold text-indigo-600">{row.B_ft}</TableCell>
                    <TableCell>{row.B_m}</TableCell>
                    <TableCell>{row.H_over_B}</TableCell>
                    <TableCell>{row.qu_kPa}</TableCell>
                    <TableCell className="font-semibold text-emerald-600">{row.qa_kPa}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}