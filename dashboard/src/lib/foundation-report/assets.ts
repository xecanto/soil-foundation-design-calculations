import { REPORT_THEME } from './theme'

function encodeSvg(svg: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

async function svgToPngDataUrl(svgMarkup: string, width: number, height: number) {
  return new Promise<string>((resolve, reject) => {
    const image = new Image()
    image.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const context = canvas.getContext('2d')
      if (!context) {
        reject(new Error('Canvas context unavailable'))
        return
      }
      context.clearRect(0, 0, width, height)
      context.drawImage(image, 0, 0, width, height)
      resolve(canvas.toDataURL('image/png'))
    }
    image.onerror = () => reject(new Error('Unable to load logo asset for PDF report'))
    image.src = encodeSvg(svgMarkup)
  })
}

export async function getBrandLogoDataUrl() {
  const response = await fetch('/logo.svg')
  if (!response.ok) {
    throw new Error('Unable to fetch logo asset for PDF report')
  }
  const svgMarkup = await response.text()
  return svgToPngDataUrl(svgMarkup, 1100, 380)
}

export function drawPageAtmosphere(doc: import('jspdf').jsPDF) {
  doc.setFillColor(...REPORT_THEME.cream)
  doc.rect(0, 0, 210, 297, 'F')

  doc.setFillColor(...REPORT_THEME.mist)
  doc.circle(172, 38, 40, 'F')

  doc.setFillColor(255, 238, 213)
  doc.circle(32, 248, 28, 'F')

  doc.setDrawColor(...REPORT_THEME.slate200)
  for (let x = 0; x <= 210; x += 12) {
    doc.line(x, 0, x, 210)
  }
  for (let y = 0; y <= 210; y += 12) {
    doc.line(0, y, 210, y)
  }
}