import { addCoverPage } from './cover-page'
import { addMethodPage } from './method-page'
import { FoundationReportOptions } from './types'
import { REPORT_THEME } from './theme'

export async function generateFoundationReportPdf(options: FoundationReportOptions) {
  const [{ jsPDF }, autoTableModule] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ])

  const autoTable = autoTableModule.default
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  await addCoverPage({ doc, autoTable }, options)

  addMethodPage(
    { doc, autoTable },
    {
      title: 'Terzaghi Bearing Capacity',
      accent: REPORT_THEME.brandBlue,
      description: 'This page summarizes the Terzaghi bearing capacity iterations for the current site and layered input profile.',
      data: options.terzaghiResults,
      includeGeneralFactors: false,
    }
  )

  addMethodPage(
    { doc, autoTable },
    {
      title: 'General Bearing Capacity',
      accent: REPORT_THEME.brandOrange,
      description: 'This page summarizes the General Bearing Capacity method using the weighted friction angle with the relevant bearing, shape, and depth factors.',
      data: options.generalResults,
      includeGeneralFactors: true,
    }
  )

  const url = doc.output('bloburl')
  window.open(url, '_blank', 'noopener,noreferrer')
}

export type { FoundationReportOptions } from './types'