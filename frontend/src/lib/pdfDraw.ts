import type { jsPDF } from 'jspdf'

const C = {
  band: '#56236b',
  header: '#3a144f',
  teal: '#0084b5',
  gold: '#f4ffef',
  goldPlus: '#fff7db',
  platinum: '#eff7ff',
  gray: '#f4f4f9',
  border: '#d1d1d1',
  text: '#1e1e1e',
  white: '#ffffff',
} as const

const PAGE_W = 595.28
const ML = 40
const MR = 555.28
const BAND_H = 78
const PARTICULARS_W = 220
const TABLE_TOP = 218
const HEADER_H = 25.8
const ROW_H = 27
const CELL_PAD_L = 6
const FOOTER_LINE_Y = 777.9
const LOGO_X = 40
const LOGO_Y = 24
const LOGO_W = 120
const LOGO_H = 30

const PLAN_COLOR: Record<string, string> = {
  Gold: C.gold,
  'Gold+': C.goldPlus,
  Platinum: C.platinum,
}

const rgb = (h: string): [number, number, number] => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
]

/** Vertically centre text baseline inside a table row/cell. */
function vCenter(top: number, rowH: number, fontSize: number) {
  return top + rowH / 2 + fontSize * 0.35
}

export type RowKind = 'normal' | 'section' | 'final'

export interface PdfRow {
  label: string
  values: string[]
  kind: RowKind
}

export interface PdfPayload {
  title: string
  subtitle: string
  quoteNumber: string
  date: string
  detailsLeft: { label: string; value: string }[]
  detailsRight: { label: string; value: string }[]
  columns: string[]
  rows: PdfRow[]
  notesTitle: string
  notes: { title: string; body: string }[]
  executive: { name: string; email: string; phone: string } | null
  logoDataUrl: string | null
}

/** Build column x-boundaries: [particularsLeft, particularsRight, ...planRights]. */
function colBounds(nPlans: number): number[] {
  const x0 = ML
  const x1 = ML + PARTICULARS_W
  if (nPlans === 0) return [x0, x1, MR]
  const planW = (MR - x1) / nPlans
  const bounds = [x0, x1]
  for (let i = 1; i <= nPlans; i++) bounds.push(x1 + planW * i)
  return bounds
}

function colWidth(bounds: number[], i: number) {
  return bounds[i + 1] - bounds[i]
}

function colCenter(bounds: number[], i: number) {
  return (bounds[i] + bounds[i + 1]) / 2
}

function colRight(bounds: number[], i: number) {
  return bounds[i + 1] - 8
}

function fillRect(doc: jsPDF, x: number, y: number, w: number, h: number, fill: string, withBorder = true) {
  doc.setFillColor(...rgb(fill))
  if (withBorder) {
    doc.setDrawColor(...rgb(C.border))
    doc.setLineWidth(0.6)
    doc.rect(x, y, w, h, 'FD')
  } else {
    doc.rect(x, y, w, h, 'F')
  }
}

function drawHeader(doc: jsPDF, p: PdfPayload, showMeta: boolean) {
  doc.setFillColor(...rgb(C.band))
  doc.rect(0, 0, PAGE_W, BAND_H, 'F')

  if (p.logoDataUrl) {
    try {
      doc.addImage(p.logoDataUrl, 'PNG', LOGO_X, LOGO_Y, LOGO_W, LOGO_H)
    } catch {
      /* ignore */
    }
  }

  doc.setTextColor(...rgb(C.white))
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text(p.title, PAGE_W / 2, 26, { align: 'center' })
  doc.setFontSize(14)
  doc.text(p.subtitle, PAGE_W / 2, 43, { align: 'center' })

  if (showMeta) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text(`Quote #: ${p.quoteNumber}`, PAGE_W / 2, 59, { align: 'center' })
    doc.text(`Date: ${p.date}`, MR, 26, { align: 'right' })
  }
}

function drawFooter(doc: jsPDF, p: PdfPayload) {
  doc.setDrawColor(...rgb(C.band))
  doc.setLineWidth(2)
  doc.line(ML, FOOTER_LINE_Y, MR, FOOTER_LINE_Y)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...rgb(C.text))
  const e = p.executive
  doc.text(`Executive Name : ${e?.name ?? ''}`, ML, 790)
  doc.text(`Email: ${e?.email ?? ''}`, ML, 802)
  doc.text(`Phone: ${e?.phone ?? ''}`, ML, 814)
}

function drawDetails(doc: jsPDF, p: PdfPayload) {
  doc.setFillColor(...rgb(C.gray))
  doc.setDrawColor(...rgb(C.border))
  doc.setLineWidth(0.2)
  doc.roundedRect(40, 96, MR - 40, 96, 3, 3, 'FD')

  const ys = [114, 134, 154]
  const drawCol = (items: { label: string; value: string }[], x: number) => {
    items.forEach((it, i) => {
      const y = ys[i]
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.setTextColor(...rgb(C.text))
      doc.text(it.label, x, y)
      const w = doc.getTextWidth(it.label)
      doc.setFont('helvetica', 'normal')
      doc.text(it.value, x + w + 5, y)
    })
  }
  drawCol(p.detailsLeft, 54)
  drawCol(p.detailsRight, 303.6)

  doc.setDrawColor(...rgb(C.border))
  doc.setLineWidth(1)
  doc.line(ML, 206, MR, 206)
}

function drawTable(doc: jsPDF, p: PdfPayload) {
  const nPlans = p.columns.length
  const bounds = colBounds(nPlans)

  // Header row
  for (let c = 0; c < bounds.length - 1; c++) {
    fillRect(doc, bounds[c], TABLE_TOP, colWidth(bounds, c), HEADER_H, C.header)
  }

  doc.setTextColor(...rgb(C.white))
  doc.setFont('helvetica', 'bold')
  const hb = vCenter(TABLE_TOP, HEADER_H, 11)
  doc.setFontSize(11)
  doc.text('Particulars', bounds[0] + CELL_PAD_L, hb)
  p.columns.forEach((col, i) => {
    doc.setFontSize(col === 'Platinum' ? 12 : 11)
    doc.text(col, colCenter(bounds, i + 1), hb, { align: 'center' })
  })

  p.rows.forEach((row, i) => {
    const top = TABLE_TOP + HEADER_H + i * ROW_H
    const isFinal = row.kind === 'final'
    const isSection = row.kind === 'section'

    const fParticulars = isFinal ? C.band : isSection ? C.teal : i % 2 === 0 ? C.gray : C.white
    fillRect(doc, bounds[0], top, colWidth(bounds, 0), ROW_H, fParticulars)

    for (let pi = 0; pi < nPlans; pi++) {
      const planName = p.columns[pi]
      const fill = isFinal ? C.band : PLAN_COLOR[planName] ?? C.white
      fillRect(doc, bounds[pi + 1], top, colWidth(bounds, pi + 1), ROW_H, fill)
    }

    const by = vCenter(top, ROW_H, 13)
    doc.setFontSize(13)

    if (isSection) {
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...rgb(C.white))
      doc.text(row.label, bounds[0] + CELL_PAD_L, by)
      return
    }

    if (isFinal) {
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...rgb(C.white))
      doc.text(row.label, bounds[0] + CELL_PAD_L, by)
      row.values.forEach((v, pi) => {
        doc.text(v, colRight(bounds, pi + 1), by, { align: 'right' })
      })
      return
    }

    doc.setTextColor(...rgb(C.text))
    doc.setFont('helvetica', 'normal')
    doc.text(row.label, bounds[0] + CELL_PAD_L, by)
    row.values.forEach((v, pi) => {
      const isLast = pi === row.values.length - 1
      doc.setFont('helvetica', isLast ? 'bold' : 'normal')
      doc.text(v, colRight(bounds, pi + 1), by, { align: 'right' })
    })
  })
}

function drawNotes(doc: jsPDF, p: PdfPayload) {
  doc.setFillColor(...rgb(C.teal))
  doc.rect(40, 98, MR - 40, 24, 'F')
  doc.setTextColor(...rgb(C.white))
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text(p.notesTitle, 52, 110.5)

  let y = 148
  const wrapWidth = MR - 50

  for (const note of p.notes) {
    if (y > 740) {
      drawFooter(doc, p)
      doc.addPage()
      drawHeader(doc, p, false)
      y = 148
    }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(...rgb(C.text))
    doc.text(note.title, 50, y)
    y += 22

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    const lines = doc.splitTextToSize(note.body, wrapWidth) as string[]
    for (const line of lines) {
      doc.text(line, 50, y)
      y += 13
    }
    y += 12
  }
}

export function drawQuotePdf(doc: jsPDF, p: PdfPayload) {
  drawHeader(doc, p, true)
  drawDetails(doc, p)
  drawTable(doc, p)
  drawFooter(doc, p)

  doc.addPage()
  drawHeader(doc, p, false)
  drawNotes(doc, p)
  drawFooter(doc, p)
}
