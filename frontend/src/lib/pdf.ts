import { jsPDF } from 'jspdf'
import { inr } from './rates'
import { drawQuotePdf, type PdfPayload, type PdfRow } from './pdfDraw'
import { EV_NOTES, MOTOR_NOTES } from './notes'
import type { Executive, QuoteConfig, QuoteResult } from './types'

interface PdfArgs {
  form: {
    ownerName: string
    vehicleNumber: string
    vehicleModel: string
    phoneNumber: string
    idv: number
    isEv: boolean
  }
  result: QuoteResult
  config: QuoteConfig
  executive: Executive | null
  quoteNumber: string
  /** Which plan columns to include in the PDF table. At least one required. */
  pdfColumns: string[]
  /** Use the saved quote date instead of today (ISO string from DB). */
  quoteDate?: string
}

let logoCache: string | null | undefined

async function loadLogo(): Promise<string | null> {
  if (logoCache !== undefined) return logoCache
  try {
    const res = await fetch('/sbi-logo.png')
    const blob = await res.blob()
    logoCache = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch {
    logoCache = null
  }
  return logoCache
}

function fmtDate(d = new Date()): string {
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}/${mm}/${d.getFullYear()}`
}

function fmtDateIso(iso?: string): string {
  if (!iso) return fmtDate()
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? fmtDate() : fmtDate(d)
}

export function buildPayload({ form, result, config, executive, quoteNumber, pdfColumns, quoteDate, logoDataUrl }: PdfArgs & { logoDataUrl: string | null }): PdfPayload {
  const { base } = result
  const columns = pdfColumns.length > 0 ? pdfColumns : config.plans
  const ncb = base.ncbAmt && base.odAfterDiscount ? Math.round((base.ncbAmt / base.odAfterDiscount) * 100) : 0

  const both = (n: number): string[] => columns.map(() => inr(n))

  const rows: PdfRow[] = [
    { label: 'Own Damage', values: both(base.od), kind: 'normal' },
    { label: 'Own Damage Discount', values: both(-base.odDiscountAmt), kind: 'normal' },
    { label: 'OD after discount', values: both(base.odAfterDiscount), kind: 'normal' },
    { label: `NCB ${ncb}%`, values: both(-base.ncbAmt), kind: 'normal' },
    { label: 'Final OD Premium (A)', values: both(base.finalOdPremiumA), kind: 'normal' },
    { label: 'Add-on covers', values: [], kind: 'section' },
  ]

  for (const addon of result.addonOrder) {
    rows.push({
      label: addon,
      values: columns.map((p) => {
        const v = result.plans[p]?.addonPremiums[addon]
        return v == null ? '-' : inr(v)
      }),
      kind: 'normal',
    })
  }

  rows.push(
    { label: 'Total Add on Premium (B)', values: columns.map((p) => inr(result.plans[p]?.totalAddonPremiumB ?? 0)), kind: 'normal' },
    { label: 'Total OD+ADD ON (A+B)', values: columns.map((p) => inr(result.plans[p]?.subtotal ?? 0)), kind: 'normal' },
    { label: `GST ${config.gstRate}%`, values: columns.map((p) => inr(result.plans[p]?.gst ?? 0)), kind: 'normal' },
    { label: 'Final Premium', values: columns.map((p) => inr(result.plans[p]?.finalPremiumRounded ?? 0)), kind: 'final' },
  )

  return {
    title: 'SBI GENERAL INSURANCE',
    subtitle: form.isEv ? 'EV Own Damage Quotation' : 'Motor Own Damage Quotation',
    quoteNumber,
    date: fmtDateIso(quoteDate),
    detailsLeft: [
      { label: 'Owner Name:', value: form.ownerName || '' },
      { label: 'Vehicle Number:', value: form.vehicleNumber || '' },
      { label: 'Vehicle Model:', value: form.vehicleModel || '' },
    ],
    detailsRight: [
      { label: 'IDV / Vehicle Value:', value: form.idv ? inr(form.idv) : '' },
      { label: 'Quote No.:', value: quoteNumber },
      { label: 'Phone No.:', value: form.phoneNumber || '' },
    ],
    columns,
    rows,
    notesTitle: 'Add-On Cover Notes',
    notes: form.isEv ? EV_NOTES : MOTOR_NOTES,
    executive: executive
      ? { name: executive.name ?? '', email: executive.email ?? '', phone: executive.phone ?? '' }
      : { name: '', email: '', phone: '' },
    logoDataUrl,
  }
}

export async function generateQuotePdf(args: PdfArgs) {
  const logoDataUrl = await loadLogo()
  const payload = buildPayload({ ...args, logoDataUrl })
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  drawQuotePdf(doc, payload)
  const name = (args.form.vehicleNumber || args.form.ownerName || args.quoteNumber || 'quote').replace(/\s+/g, '_')
  doc.save(`SBI_Quote_${name}.pdf`)
}
