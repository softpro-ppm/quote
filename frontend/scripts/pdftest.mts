import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { jsPDF } from 'jspdf'
import { computeQuote } from '../src/lib/rates'
import { buildPayload } from '../src/lib/pdf'
import { drawQuotePdf } from '../src/lib/pdfDraw'
import type { QuoteConfig } from '../src/lib/types'

const API = 'http://127.0.0.1:8799/api'

async function cfg(): Promise<QuoteConfig> {
  const login = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' }),
  }).then((r) => r.json())
  const res = await fetch(`${API}/settings`, {
    headers: { Authorization: `Bearer ${login.data.token}` },
  }).then((r) => r.json())
  return res.data as QuoteConfig
}

function gen(
  config: QuoteConfig,
  isEv: boolean,
  quoteNumber: string,
  out: string,
) {
  const result = computeQuote(
    { idv: 1_000_000, odDiscount: 90, ncb: 20, zone: 'B', isEv },
    config,
  )
  const logo = 'data:image/png;base64,' + readFileSync('../brand/sbi-general-logo.png').toString('base64')
  const payload = buildPayload({
    form: {
      ownerName: 'RAJESH GULLA',
      vehicleNumber: 'AP39HG0020',
      vehicleModel: 'XUV',
      phoneNumber: '9550755039',
      idv: 1_000_000,
      isEv,
    },
    result,
    config,
    executive: {
      id: 1,
      name: 'GULLA RAJESH',
      email: 'rajesh.bfa@gmail.com',
      phone: '9550755039',
      is_active: 1,
    },
    quoteNumber,
    pdfColumns: config.plans,
    logoDataUrl: logo,
  })
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  drawQuotePdf(doc, payload)
  writeFileSync(out, Buffer.from(doc.output('arraybuffer')))
  const p = payload
  const final = p.rows.find((r) => r.kind === 'final')
  console.log(out, 'columns:', p.columns.join(', '), 'final:', final?.values.join(' / '))
}

mkdirSync('../.pdfref', { recursive: true })
const config = await cfg()
await gen(config, false, 'Q20260617-0002', '../.pdfref/gen-MOTOR.pdf')
await gen(config, true, 'Q20260617-0001', '../.pdfref/gen-EV.pdf')
