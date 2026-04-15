import { FoundationResult } from '@/types'
import { PdfDeps } from './types'
import { PAGE, REPORT_THEME } from './theme'

function rowsForMethod(data: FoundationResult[], includeGeneralFactors: boolean) {
  return data.map(row => {
    const base = [
      row.iteration,
      row.H_ft,
      row.B_ft,
      row.H_over_B,
      row.phi,
      row.Nc,
      row.Nq,
      row.N_gamma,
      row.qu_kPa,
      row.qa_kPa,
    ]

    if (!includeGeneralFactors) return base

    return [
      ...base,
      row.shape_c ?? '-',
      row.shape_q ?? '-',
      row.shape_gamma ?? '-',
      row.depth_c ?? '-',
      row.depth_q ?? '-',
    ]
  })
}

export function addMethodPage(
  { doc, autoTable }: PdfDeps,
  {
    title,
    accent,
    description,
    data,
    includeGeneralFactors,
  }: {
    title: string
    accent: [number, number, number]
    description: string
    data: FoundationResult[]
    includeGeneralFactors: boolean
  }
) {
  doc.addPage('a4', 'portrait')

  doc.setFillColor(255, 255, 255)
  doc.rect(0, 0, PAGE.width, PAGE.height, 'F')
  doc.setFillColor(...accent)
  doc.rect(0, 0, PAGE.width, 28, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.text(title, PAGE.marginX, 18)

  doc.setTextColor(...REPORT_THEME.slate700)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  const wrappedDescription = doc.splitTextToSize(description, PAGE.width - PAGE.marginX * 2)
  doc.text(wrappedDescription, PAGE.marginX, 42)

  const summaryY = 58
  doc.setFillColor(248, 250, 252)
  doc.roundedRect(PAGE.marginX, summaryY, 178, 26, 6, 6, 'F')
  doc.setDrawColor(...REPORT_THEME.slate200)
  doc.roundedRect(PAGE.marginX, summaryY, 178, 26, 6, 6)
  doc.setTextColor(...REPORT_THEME.slate500)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('VALID ITERATIONS', PAGE.marginX + 8, summaryY + 10)
  doc.text('BEST qa (kPa)', PAGE.marginX + 72, summaryY + 10)
  doc.text('LOWEST B (ft)', PAGE.marginX + 128, summaryY + 10)

  const bestQa = data.length > 0 ? Math.max(...data.map(row => row.qa_kPa)) : 0
  const minB = data.length > 0 ? Math.min(...data.map(row => row.B_ft)) : 0
  doc.setTextColor(...REPORT_THEME.slate900)
  doc.setFontSize(15)
  doc.text(String(data.length), PAGE.marginX + 8, summaryY + 20)
  doc.text(bestQa ? bestQa.toFixed(2) : '0.00', PAGE.marginX + 72, summaryY + 20)
  doc.text(minB ? minB.toFixed(3) : '0.000', PAGE.marginX + 128, summaryY + 20)

  autoTable(doc, {
    startY: 94,
    margin: { left: PAGE.marginX, right: PAGE.marginX },
    head: [includeGeneralFactors
      ? ['#', 'H (ft)', 'B (ft)', 'H/B', 'φavg', 'Nc', 'Nq', 'Nγ', 'qu', 'qa', 'sc', 'sq', 'sγ', 'dc', 'dq']
      : ['#', 'H (ft)', 'B (ft)', 'H/B', 'φavg', 'Nc', 'Nq', 'Nγ', 'qu', 'qa']],
    body: rowsForMethod(data, includeGeneralFactors),
    styles: {
      fontSize: 8,
      cellPadding: 2.4,
      textColor: REPORT_THEME.slate900,
      valign: 'middle',
    },
    headStyles: {
      fillColor: accent,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  })

  doc.setTextColor(...REPORT_THEME.slate500)
  doc.setFontSize(9)
  doc.text('All values shown reflect the current scenario and factor of safety = 3.', PAGE.marginX, 287)
}