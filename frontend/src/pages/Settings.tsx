import { useEffect, useState } from 'react'
import { useSettings } from '../context/SettingsContext'
import { apiErrorMessage } from '../lib/api'
import type { AddonRate, AddonTable, QuoteConfig } from '../lib/types'

type NcbKey = 'ncbPositive' | 'ncbZero'
type VehicleKey = 'motor' | 'ev'

const clone = (c: QuoteConfig): QuoteConfig => JSON.parse(JSON.stringify(c))

export default function Settings() {
  const { config, loading, save } = useSettings()
  const [draft, setDraft] = useState<QuoteConfig | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (config) setDraft(clone(config))
  }, [config])

  if (loading || !draft) {
    return <p className="text-sm text-slate-500">Loading settings…</p>
  }

  const mutate = (fn: (d: QuoteConfig) => void) => {
    setDraft((prev) => {
      if (!prev) return prev
      const next = clone(prev)
      fn(next)
      return next
    })
  }

  const handleSave = async () => {
    if (!draft) return
    setSaving(true)
    setMessage(null)
    try {
      await save(draft)
      setMessage('Settings saved.')
    } catch (err) {
      setMessage(apiErrorMessage(err, 'Could not save settings'))
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    if (config) setDraft(clone(config))
    setMessage(null)
  }

  const inputCls = 'rounded-md border border-slate-300 px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-sky-500'

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Rate Settings</h2>
          <p className="text-sm text-slate-500">All values are stored on the server. No data is kept in the browser.</p>
        </div>
        <div className="flex items-center gap-3">
          {message && <span className="text-sm text-emerald-700">{message}</span>}
          <button onClick={handleReset} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
            Reset
          </button>
          <button onClick={handleSave} disabled={saving} className="rounded-lg bg-[#0a3d62] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0c4a78] disabled:opacity-60">
            {saving ? 'Saving…' : 'Save All'}
          </button>
        </div>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-slate-700">General</h3>
        <div className="flex items-center gap-3">
          <label className="text-sm text-slate-600">GST %</label>
          <input
            className={`${inputCls} w-24`}
            type="number"
            step="0.01"
            value={draft.gstRate}
            onChange={(e) => mutate((d) => { d.gstRate = Number(e.target.value) })}
          />
          <span className="text-sm text-slate-600 ml-4">Plans:</span>
          <span className="text-sm font-medium text-slate-700">{draft.plans.join(' · ')}</span>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">OD Rate Zones</h3>
          <button
            onClick={() => mutate((d) => { d.odRateZones.push({ code: '', label: 'New Zone', rate: 0 }) })}
            className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            + Add Zone
          </button>
        </div>
        <div className="space-y-2">
          {draft.odRateZones.map((z, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2">
              <input className={`${inputCls} w-20`} placeholder="Code" value={z.code} onChange={(e) => mutate((d) => { d.odRateZones[i].code = e.target.value })} />
              <input className={`${inputCls} w-48`} placeholder="Label" value={z.label} onChange={(e) => mutate((d) => { d.odRateZones[i].label = e.target.value })} />
              <input className={`${inputCls} w-28`} type="number" step="0.001" value={z.rate} onChange={(e) => mutate((d) => { d.odRateZones[i].rate = Number(e.target.value) })} />
              <span className="text-xs text-slate-400">%</span>
              <button onClick={() => mutate((d) => { d.odRateZones.splice(i, 1) })} className="text-xs text-rose-500 hover:underline">remove</button>
            </div>
          ))}
        </div>
      </section>

      {(['motor', 'ev'] as VehicleKey[]).map((vk) => (
        <VehicleEditor key={vk} draft={draft} vehicleKey={vk} mutate={mutate} />
      ))}
    </div>
  )
}

function VehicleEditor({
  draft,
  vehicleKey,
  mutate,
}: {
  draft: QuoteConfig
  vehicleKey: VehicleKey
  mutate: (fn: (d: QuoteConfig) => void) => void
}) {
  const table = draft.tables[vehicleKey]
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">{table.label} — Add-on Tables</h3>
        <button
          onClick={() =>
            mutate((d) => {
              d.tables[vehicleKey].ncbZero = JSON.parse(JSON.stringify(d.tables[vehicleKey].ncbPositive))
            })
          }
          className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
        >
          Copy NCB&gt;0 → NCB=0
        </button>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {(['ncbPositive', 'ncbZero'] as NcbKey[]).map((nk) => (
          <AddonTableEditor
            key={nk}
            title={nk === 'ncbPositive' ? 'NCB > 0' : 'NCB = 0'}
            plans={draft.plans}
            order={table.addonOrder}
            addons={table[nk]}
            onChange={(addon, plan, rate) =>
              mutate((d) => {
                d.tables[vehicleKey][nk][addon][plan] = rate
              })
            }
          />
        ))}
      </div>
    </section>
  )
}

function AddonTableEditor({
  title,
  plans,
  order,
  addons,
  onChange,
}: {
  title: string
  plans: string[]
  order: string[]
  addons: AddonTable
  onChange: (addon: string, plan: string, rate: AddonRate) => void
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <div className="bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">{title}</div>
      <table className="w-full text-xs">
        <thead className="bg-slate-50/60 text-slate-500">
          <tr>
            <th className="px-2 py-1 text-left">Add-on</th>
            {plans.map((p) => (
              <th key={p} className="px-2 py-1 text-center">{p}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {order.map((addon) => (
            <tr key={addon}>
              <td className="px-2 py-1 font-medium text-slate-600">{addon}</td>
              {plans.map((p) => (
                <td key={p} className="px-2 py-1">
                  <CellEditor rate={addons[addon]?.[p] ?? { type: 'na' }} onChange={(r) => onChange(addon, p, r)} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function CellEditor({ rate, onChange }: { rate: AddonRate; onChange: (r: AddonRate) => void }) {
  const cls = 'w-full rounded border border-slate-300 px-1 py-0.5 text-xs outline-none focus:ring-1 focus:ring-sky-500'
  return (
    <div className="flex flex-col gap-1">
      <select
        className={cls}
        value={rate.type}
        onChange={(e) => {
          const t = e.target.value
          if (t === 'na') onChange({ type: 'na' })
          else if (t === 'fixed') onChange({ type: 'fixed', amount: rate.type === 'fixed' ? rate.amount : 0 })
          else onChange({ type: 'percentOfIdv', rate: rate.type === 'percentOfIdv' ? rate.rate : 0 })
        }}
      >
        <option value="na">N/A</option>
        <option value="percentOfIdv">% of IDV</option>
        <option value="fixed">Fixed ₹</option>
      </select>
      {rate.type === 'percentOfIdv' && (
        <input className={cls} type="number" step="0.0001" value={rate.rate} onChange={(e) => onChange({ type: 'percentOfIdv', rate: Number(e.target.value) })} />
      )}
      {rate.type === 'fixed' && (
        <input className={cls} type="number" step="1" value={rate.amount} onChange={(e) => onChange({ type: 'fixed', amount: Number(e.target.value) })} />
      )}
    </div>
  )
}
