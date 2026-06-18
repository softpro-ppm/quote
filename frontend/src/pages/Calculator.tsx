import { useEffect, useMemo, useState } from 'react'
import { useSettings } from '../context/SettingsContext'
import { api, apiErrorMessage } from '../lib/api'
import { computeQuote, inr } from '../lib/rates'
import type { Executive, QuoteInputs } from '../lib/types'
import QuoteResultTable from '../components/QuoteResultTable'
import { generateQuotePdf } from '../lib/pdf'

interface FormState extends QuoteInputs {
  ownerName: string
  vehicleNumber: string
  vehicleModel: string
  phoneNumber: string
  executiveId: string
}

export default function Calculator() {
  const { config, loading } = useSettings()
  const [executives, setExecutives] = useState<Executive[]>([])
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [savedQuoteNumber, setSavedQuoteNumber] = useState<string | null>(null)
  const [pdfPlans, setPdfPlans] = useState({ Gold: true, 'Gold+': true, Platinum: true })

  const [form, setForm] = useState<FormState>({
    ownerName: '',
    vehicleNumber: '',
    vehicleModel: '',
    phoneNumber: '',
    executiveId: '',
    idv: 0,
    odDiscount: 90,
    ncb: 20,
    zone: 'A',
    isEv: false,
  })

  useEffect(() => {
    api
      .get('/executives', { params: { active: 'true' } })
      .then((res) => setExecutives(res.data.data))
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    if (config && config.odRateZones.length > 0) {
      setForm((f) => {
        const codes = config.odRateZones.map((z) => z.code)
        let zone = f.zone === 'C' ? 'B' : f.zone
        if (!codes.includes(zone)) zone = config.odRateZones[0].code
        return { ...f, zone }
      })
    }
  }, [config])

  const result = useMemo(() => {
    if (!config) return null
    return computeQuote(
      { idv: Number(form.idv), odDiscount: Number(form.odDiscount), ncb: Number(form.ncb), zone: form.zone, isEv: form.isEv },
      config,
    )
  }, [config, form.idv, form.odDiscount, form.ncb, form.zone, form.isEv])

  if (loading || !config) {
    return <p className="text-sm text-slate-500">Loading rate settings…</p>
  }

  const update = (patch: Partial<FormState>) => {
    setSavedQuoteNumber(null)
    setMessage(null)
    setForm((f) => ({ ...f, ...patch }))
  }

  const persist = async (): Promise<string> => {
    if (!result) throw new Error('No result')
    if (!Number(form.idv) || Number(form.idv) <= 0) {
      throw new Error('Enter a valid IDV first.')
    }
    const res = await api.post('/quotes', {
      owner_name: form.ownerName || null,
      vehicle_number: form.vehicleNumber || null,
      vehicle_model: form.vehicleModel || null,
      phone_number: form.phoneNumber || null,
      idv: Number(form.idv),
      od_discount: Number(form.odDiscount),
      ncb: Number(form.ncb),
      executive_id: form.executiveId ? Number(form.executiveId) : null,
      gold_premium: result.plans['Gold']?.finalPremiumRounded ?? 0,
      platinum_premium: result.plans['Platinum']?.finalPremiumRounded ?? 0,
      is_ev: form.isEv ? 1 : 0,
    })
    const qn = res.data.data.quote_number as string
    setSavedQuoteNumber(qn)
    return qn
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)
    try {
      const qn = await persist()
      setMessage(`Saved as ${qn}`)
    } catch (err) {
      setMessage(err instanceof Error && err.message.startsWith('Enter') ? err.message : apiErrorMessage(err, 'Could not save quote'))
    } finally {
      setSaving(false)
    }
  }

  const handlePdf = async () => {
    if (!result) return
    const selected = config.plans.filter((p) => pdfPlans[p as keyof typeof pdfPlans])
    if (selected.length === 0) {
      setMessage('Select at least one plan column for the PDF.')
      return
    }
    setSaving(true)
    setMessage(null)
    try {
      const quoteNumber = savedQuoteNumber ?? (await persist())
      const exec = executives.find((e) => String(e.id) === form.executiveId) ?? null
      await generateQuotePdf({ form, result, config, executive: exec, quoteNumber, pdfColumns: selected })
    } catch (err) {
      setMessage(err instanceof Error && err.message.startsWith('Enter') ? err.message : apiErrorMessage(err, 'Could not generate PDF'))
    } finally {
      setSaving(false)
    }
  }

  const inputCls =
    'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500'

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-base font-semibold text-slate-800">Quotation Inputs</h2>
          <span className="text-xs text-slate-500">OD Rate is based on the selected zone.</span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Vehicle Owner Name">
            <input className={inputCls} value={form.ownerName} onChange={(e) => update({ ownerName: e.target.value })} />
          </Field>
          <Field label="Vehicle Number">
            <input className={inputCls} style={{ textTransform: 'uppercase' }} value={form.vehicleNumber} onChange={(e) => update({ vehicleNumber: e.target.value.toUpperCase() })} />
          </Field>
          <Field label="Vehicle Model">
            <input className={inputCls} style={{ textTransform: 'uppercase' }} value={form.vehicleModel} onChange={(e) => update({ vehicleModel: e.target.value.toUpperCase() })} />
          </Field>
          <Field label="Phone Number">
            <input className={inputCls} inputMode="numeric" value={form.phoneNumber} onChange={(e) => update({ phoneNumber: e.target.value })} />
          </Field>
          <Field label="Vehicle Type">
            <select className={inputCls} value={form.isEv ? 'ev' : 'ice'} onChange={(e) => update({ isEv: e.target.value === 'ev' })}>
              <option value="ice">Motor (ICE)</option>
              <option value="ev">Electric (EV)</option>
            </select>
          </Field>
          <Field label="Zone">
            <select className={inputCls} value={form.zone} onChange={(e) => update({ zone: e.target.value })}>
              {config.odRateZones.map((z) => (
                <option key={z.code} value={z.code}>
                  {z.label} ({z.rate}%)
                </option>
              ))}
            </select>
          </Field>
          <Field label="IDV / Vehicle Value">
            <input className={inputCls} inputMode="numeric" value={form.idv || ''} onChange={(e) => update({ idv: Number(e.target.value.replace(/[^0-9.]/g, '')) })} placeholder="Enter IDV" />
          </Field>
          <Field label="Executive">
            <select className={inputCls} value={form.executiveId} onChange={(e) => update({ executiveId: e.target.value })}>
              <option value="">— Select —</option>
              {executives.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="OD Discount %">
            <input className={inputCls} inputMode="numeric" value={form.odDiscount} onChange={(e) => update({ odDiscount: Number(e.target.value.replace(/[^0-9.]/g, '')) })} />
          </Field>
          <Field label="NCB %">
            <input className={inputCls} inputMode="numeric" value={form.ncb} onChange={(e) => update({ ncb: Number(e.target.value.replace(/[^0-9.]/g, '')) })} />
          </Field>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button onClick={handleSave} disabled={saving} className="rounded-lg bg-[#0a3d62] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0c4a78] disabled:opacity-60">
            {saving ? 'Saving…' : 'Save Quote'}
          </button>
          <span className="text-xs font-medium text-slate-500">PDF columns:</span>
          {config.plans.map((plan) => (
            <label key={plan} className="flex items-center gap-1.5 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={pdfPlans[plan as keyof typeof pdfPlans] ?? false}
                onChange={(e) => setPdfPlans((prev) => ({ ...prev, [plan]: e.target.checked }))}
                className="rounded border-slate-300 text-[#0a3d62] focus:ring-sky-500"
              />
              {plan}
            </label>
          ))}
          <button onClick={handlePdf} className="rounded-lg border border-[#0a3d62] px-4 py-2 text-sm font-semibold text-[#0a3d62] hover:bg-sky-50">
            Download PDF
          </button>
          {result && (
            <span className="text-sm text-slate-600">
              Platinum: <strong>₹{inr(result.plans['Platinum']?.finalPremiumRounded ?? 0)}</strong>
            </span>
          )}
          {message && <span className="text-sm text-emerald-700">{message}</span>}
        </div>
      </section>

      {result && <QuoteResultTable result={result} plans={config.plans} />}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  )
}
