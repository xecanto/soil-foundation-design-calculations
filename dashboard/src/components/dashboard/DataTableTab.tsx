'use client'

import { useState, useEffect, useCallback } from 'react'
import { fetchAPI } from '@/lib/api'
import { GeotechnicalRecord } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Search, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react'

const PAGE_SIZE = 50

export default function DataTableTab() {
  const [records, setRecords] = useState<GeotechnicalRecord[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [uscsFilter, setUscsFilter] = useState('')
  const [reportFilter, setReportFilter] = useState('')
  const [minDepth, setMinDepth] = useState('')
  const [maxDepth, setMaxDepth] = useState('')
  const [loading, setLoading] = useState(false)

  const fetchRecords = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      const offset = (page - 1) * PAGE_SIZE
      params.set('limit', String(PAGE_SIZE))
      params.set('offset', String(offset))
      if (uscsFilter) params.set('uscs', uscsFilter)
      if (reportFilter) params.set('report_no', reportFilter)
      if (minDepth) params.set('min_depth', minDepth)
      if (maxDepth) params.set('max_depth', maxDepth)

      const data = await fetchAPI<{ records: GeotechnicalRecord[]; total: number }>(
        `/data?${params.toString()}`
      )
      setRecords(data.records ?? [])
      setTotal(data.total ?? 0)
    } finally {
      setLoading(false)
    }
  }, [page, uscsFilter, reportFilter, minDepth, maxDepth])

  useEffect(() => { fetchRecords() }, [fetchRecords])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  function reset() {
    setUscsFilter('')
    setReportFilter('')
    setMinDepth('')
    setMaxDepth('')
    setPage(1)
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Search size={16} className="text-indigo-500" />
            Filter Records
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            <Input
              placeholder="USCS (e.g. CL, SM)"
              value={uscsFilter}
              onChange={e => { setUscsFilter(e.target.value); setPage(1) }}
            />
            <Input
              placeholder="Report No."
              value={reportFilter}
              onChange={e => { setReportFilter(e.target.value); setPage(1) }}
            />
            <Input
              type="number"
              placeholder="Min Depth (ft)"
              value={minDepth}
              onChange={e => { setMinDepth(e.target.value); setPage(1) }}
            />
            <Input
              type="number"
              placeholder="Max Depth (ft)"
              value={maxDepth}
              onChange={e => { setMaxDepth(e.target.value); setPage(1) }}
            />
            <Button variant="outline" onClick={reset} className="flex items-center gap-2">
              <RefreshCw size={14} />
              Reset
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Showing {records.length} of <strong>{total}</strong> records
          </p>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Report No.</TableHead>
                  <TableHead>Borehole</TableHead>
                  <TableHead>Sample</TableHead>
                  <TableHead className="text-right">Depth (ft)</TableHead>
                  <TableHead className="text-right">N-Value</TableHead>
                  <TableHead>USCS</TableHead>
                  <TableHead className="text-right">Cohesion (kPa)</TableHead>
                  <TableHead className="text-right">Unit Weight (kN/m³)</TableHead>
                  <TableHead className="text-right">Latitude</TableHead>
                  <TableHead className="text-right">Longitude</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : records.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      No records found
                    </TableCell>
                  </TableRow>
                ) : (
                  records.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">{r.report_no}</TableCell>
                      <TableCell>{r.borehole_no}</TableCell>
                      <TableCell>{r.sample_no}</TableCell>
                      <TableCell className="text-right">{r.depth}</TableCell>
                      <TableCell className="text-right font-semibold text-indigo-600">{r.n_value}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">
                          {r.uscs_classification ?? '—'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{r.cohesion}</TableCell>
                      <TableCell className="text-right">{r.unit_weight}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{r.latitude?.toFixed(4)}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{r.longitude?.toFixed(4)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1 || loading}
            onClick={() => setPage(p => p - 1)}
          >
            <ChevronLeft size={14} className="mr-1" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page === totalPages || loading}
            onClick={() => setPage(p => p + 1)}
          >
            Next
            <ChevronRight size={14} className="ml-1" />
          </Button>
        </div>
      )}
    </div>
  )
}
