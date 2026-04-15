import { FoundationReportOptions, PdfDeps } from './types'
import { drawPageAtmosphere, getBrandLogoDataUrl } from './assets'
import { PAGE, REPORT_THEME } from './theme'

export async function addCoverPage({ doc, autoTable }: PdfDeps, options: FoundationReportOptions) {
  drawPageAtmosphere(doc)

  const logoDataUrl = await getBrandLogoDataUrl()
  doc.addImage(logoDataUrl, 'PNG', PAGE.marginX, 18, 95, 33)

  doc.setTextColor(...REPORT_THEME.brandBlue)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('GEOTECHNICAL FOUNDATION REPORT', PAGE.marginX, 67)

  doc.setTextColor(...REPORT_THEME.slate900)
  doc.setFontSize(28)
  doc.text('Foundation design summary', PAGE.marginX, 87)
  doc.text('for site-specific bearing capacity', PAGE.marginX, 101)

  doc.setTextColor(...REPORT_THEME.slate700)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(12)
  doc.text(
    'This report presents the current design scenario with Terzaghi and General Bearing Capacity iterations,',
    PAGE.marginX,
    118
  )
  doc.text(
    'generated from the selected location, structural loading, and layered geotechnical properties.',
    PAGE.marginX,
    126
  )

  doc.setFillColor(...REPORT_THEME.brandBlue)
  doc.roundedRect(PAGE.marginX, 144, 84, 44, 8, 8, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('PROJECT LOCATION', PAGE.marginX + 8, 156)
  doc.setFontSize(18)
  doc.text(`${options.latitude}°N`, PAGE.marginX + 8, 169)
  doc.text(`${options.longitude}°E`, PAGE.marginX + 8, 179)

  doc.setFillColor(255, 255, 255)
  doc.roundedRect(112, 144, 82, 44, 8, 8, 'F')
  doc.setDrawColor(...REPORT_THEME.slate200)
  doc.roundedRect(112, 144, 82, 44, 8, 8)
  doc.setTextColor(...REPORT_THEME.slate500)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('SCENARIO SNAPSHOT', 120, 156)
  doc.setTextColor(...REPORT_THEME.slate900)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.text(`Coverage: ${options.coverageLabel}`, 120, 169)
  doc.text(`Load: ${options.structuralLoad} kN`, 120, 177)
  doc.text(`Groundwater: ${options.groundwaterLabel}`, 120, 185)

  autoTable(doc, {
    startY: 204,
    margin: { left: PAGE.marginX, right: PAGE.marginX },
    head: [['Method', 'Valid iterations']],
    body: [
      ['Terzaghi Bearing Capacity', options.terzaghiResults.length],
      ['General Bearing Capacity', options.generalResults.length],
    ],
    styles: {
      fontSize: 11,
      cellPadding: 4,
      textColor: REPORT_THEME.slate900,
    },
    headStyles: {
      fillColor: REPORT_THEME.brandBlue,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [250, 252, 255],
    },
  })

  doc.setTextColor(...REPORT_THEME.slate500)
  doc.setFontSize(10)
  doc.text(
    `Generated on ${new Date().toLocaleString()}`,
    PAGE.marginX,
    280
  )
  doc.text('Geofound · Precision beneath the surface', PAGE.marginX, 287)
}