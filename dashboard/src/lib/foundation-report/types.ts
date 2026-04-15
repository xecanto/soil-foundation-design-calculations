import { FoundationResult } from '@/types'

export interface FoundationReportOptions {
  latitude: string
  longitude: string
  coverageLabel: string
  groundwaterLabel: string
  structuralLoad: string
  terzaghiResults: FoundationResult[]
  generalResults: FoundationResult[]
}

export interface PdfDeps {
  doc: import('jspdf').jsPDF
  autoTable: typeof import('jspdf-autotable').default
}