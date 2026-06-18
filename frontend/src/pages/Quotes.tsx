import { useCallback, useEffect, useState } from 'react'
import { useSettings } from '../context/SettingsContext'
import { api, apiErrorMessage } from '../lib/api'
import { generateQuotePdf } from '../lib/pdf'
import { computeQuote, inferZoneForQuote, inr } from '../lib/rates'
import type { Executive, Quote } from '../lib/types'

interface Stats {
  total: number
  today: number
  thisMonth: number
  pendingFollowups: number
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface Followup {
  id: number
  quote_id: number
  notes: string
  created_at: string
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const

export default function Quotes() {
  const { config } = useSettings()
  const [stats, setStats] = useState<Stats | null>(null)
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [search, setSearch] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 10, total: 0, totalPages: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeQuote, setActiveQuote] = useState<Quote | null>(null)
  const [downloadingId, setDownloadingId] = useState<number | null>(null)

  const loadStats = useCallback(() => {
    api.get('/quotes/stats').then((res) => setStats(res.data.data)).catch(() => undefined)
  }, [])

  const loadQuotes = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get('/quotes', {
        params: {
          page,
          limit,
          search: search || undefined,
          date: dateFilter || undefined,
        },
      })
      setQuotes(res.data.data)
      setPagination(res.data.pagination ?? { page, limit, total: 0, totalPages: 0 })
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not load quotes'))
    } finally {
      setLoading(false)
    }
  }, [page, limit, search, dateFilter])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  useEffect(() => {
    const t = setTimeout(() => void loadQuotes(), 250)
    return () => clearTimeout(t)
  }, [loadQuotes])

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this quote and its follow-ups?')) return
    try {
      await api.delete(`/quotes/${id}`)
      loadStats()
      void loadQuotes()
    } catch (err) {
      alert(apiErrorMessage(err, 'Could not delete'))
    }
  }

  const handleDownload = async (q: Quote) => {
    if (!config) return
    setDownloadingId(q.id)
    try {
      const detail = await api.get(`/quotes/${q.id}`)
      const data = detail.data.data as Quote & {
        executive?: { name: string; email: string | null; phone: string | null } | null
      }

      const idv = Number(q.idv)
      const odDiscount = Number(q.od_discount)
      const ncb = Number(q.ncb)
      const isEv = Boolean(q.is_ev)
      const zone = inferZoneForQuote(idv, odDiscount, ncb, isEv, config, Number(q.platinum_premium))
      const result = computeQuote({ idv, odDiscount, ncb, zone, isEv }, config)

      const executive: Executive | null = data.executive
        ? {
            id: q.executive_id ?? 0,
            name: data.executive.name,
            email: data.executive.email,
            phone: data.executive.phone,
            is_active: 1,
          }
        : null

      await generateQuotePdf({
        form: {
          ownerName: q.owner_name ?? '',
          vehicleNumber: q.vehicle_number ?? '',
          vehicleModel: q.vehicle_model ?? '',
          phoneNumber: q.phone_number ?? '',
          idv,
          isEv,
        },
        result,
        config,
        executive,
        quoteNumber: q.quote_number,
        pdfColumns: config.plans,
        quoteDate: q.created_at,
      })
    } catch (err) {
      alert(apiErrorMessage(err, 'Could not download PDF'))
    } finally {
      setDownloadingId(null)
    }
  }

  const { total, totalPages } = pagination
  const rangeStart = total === 0 ? 0 : (page - 1) * limit + 1
  const rangeEnd = Math.min(page * limit, total)

  const inputCls =
    'rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500'

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total Quotes" value={stats?.total ?? 0} />
        <StatCard label="Today" value={stats?.today ?? 0} />
        <StatCard label="This Month" value={stats?.thisMonth ?? 0} />
        <StatCard label="Pending Follow-ups" value={stats?.pendingFollowups ?? 0} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          className={`${inputCls} w-full sm:flex-1`}
          placeholder="Search by number, owner, vehicle, phone…"
          value={search}
          onChange={(e) => {
            setPage(1)
            setSearch(e.target.value)
          }}
        />
        <div className="flex items-center gap-2 shrink-0">
          <label className="text-xs font-medium text-slate-500 whitespace-nowrap">Date</label>
          <input
            type="date"
            className={inputCls}
            value={dateFilter}
            onChange={(e) => {
              setPage(1)
              setDateFilter(e.target.value)
            }}
          />
          {dateFilter && (
            <button
              type="button"
              onClick={() => {
                setPage(1)
                setDateFilter('')
              }}
              className="rounded-lg px-2 py-2 text-xs text-slate-500 hover:bg-slate-100"
              title="Clear date filter"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {error && <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="w-10 px-2 py-2 text-center font-medium">#</th>
                <th className="px-3 py-2 text-left font-medium">Owner</th>
                <th className="px-3 py-2 text-left font-medium">Phone</th>
                <th className="px-3 py-2 text-left font-medium">Vehicle</th>
                <th className="px-3 py-2 text-right font-medium">IDV</th>
                <th className="px-3 py-2 text-right font-medium">Platinum</th>
                <th className="px-3 py-2 text-left font-medium">Date</th>
                <th className="px-3 py-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={8} className="px-3 py-6 text-center text-slate-400">Loading…</td></tr>
              ) : quotes.length === 0 ? (
                <tr><td colSpan={8} className="px-3 py-6 text-center text-slate-400">No quotes found.</td></tr>
              ) : (
                quotes.map((q, i) => (
                  <tr key={q.id} className="hover:bg-slate-50/60">
                    <td className="w-10 px-2 py-2 text-center font-medium text-slate-700 tabular-nums">{(page - 1) * limit + i + 1}</td>
                    <td className="px-3 py-2 text-slate-600">{q.owner_name ?? '-'}</td>
                    <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{q.phone_number ?? '-'}</td>
                    <td className="px-3 py-2 text-slate-600">
                      {q.vehicle_number ?? '-'}
                      {q.is_ev ? <span className="ml-1 rounded bg-emerald-100 px-1 text-[10px] text-emerald-700">EV</span> : null}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-600">₹{inr(Number(q.idv))}</td>
                    <td className="px-3 py-2 text-right font-medium text-slate-700">₹{inr(Number(q.platinum_premium))}</td>
                    <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{(q.created_at ?? '').slice(0, 10)}</td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      <button
                        onClick={() => void handleDownload(q)}
                        disabled={downloadingId === q.id || !config}
                        className="text-[#0a3d62] hover:underline disabled:opacity-50"
                      >
                        {downloadingId === q.id ? 'PDF…' : 'PDF'}
                      </button>
                      <button onClick={() => setActiveQuote(q)} className="ml-3 text-sky-600 hover:underline">Follow-ups</button>
                      <button onClick={() => handleDelete(q.id)} className="ml-3 text-rose-500 hover:underline">Delete</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-2 border-t border-slate-200 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-slate-600">
            <span className="text-xs text-slate-500 whitespace-nowrap">Per page</span>
            <select
              className="rounded border border-slate-300 px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-sky-500"
              value={limit}
              onChange={(e) => {
                setPage(1)
                setLimit(Number(e.target.value))
              }}
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <span className="text-xs text-slate-400">
              {total > 0 ? `${rangeStart}–${rangeEnd} of ${total}` : '0 results'}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3 sm:justify-end">
            <span className="text-slate-500">
              Page {totalPages === 0 ? 0 : page} of {totalPages}
            </span>
            <div className="flex gap-1">
              <button
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => p - 1)}
                className="rounded px-3 py-1 text-slate-600 disabled:opacity-40 hover:bg-slate-100"
              >
                Prev
              </button>
              <button
                disabled={page >= totalPages || totalPages === 0 || loading}
                onClick={() => setPage((p) => p + 1)}
                className="rounded px-3 py-1 text-slate-600 disabled:opacity-40 hover:bg-slate-100"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {activeQuote && (
        <FollowupModal quote={activeQuote} onClose={() => { setActiveQuote(null); loadStats(); void loadQuotes() }} />
      )}
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-[#0a3d62]">{value}</p>
    </div>
  )
}

function FollowupModal({ quote, onClose }: { quote: Quote; onClose: () => void }) {
  const [items, setItems] = useState<Followup[]>([])
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    api.get(`/followups/${quote.id}`).then((res) => setItems(res.data.data)).catch(() => undefined)
  }, [quote.id])

  useEffect(() => { load() }, [load])

  const add = async () => {
    if (!notes.trim()) return
    setSaving(true)
    try {
      await api.post('/followups', { quote_id: quote.id, notes: notes.trim() })
      setNotes('')
      load()
    } catch (err) {
      alert(apiErrorMessage(err, 'Could not add follow-up'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-800">Follow-ups · {quote.quote_number}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
        <div className="mb-3 max-h-60 space-y-2 overflow-y-auto">
          {items.length === 0 ? (
            <p className="text-sm text-slate-400">No follow-ups yet.</p>
          ) : (
            items.map((f) => (
              <div key={f.id} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                <p className="text-sm text-slate-700">{f.notes}</p>
                <p className="mt-0.5 text-xs text-slate-400">{(f.created_at ?? '').slice(0, 16).replace('T', ' ')}</p>
              </div>
            ))
          )}
        </div>
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500"
            placeholder="Add a note…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
          />
          <button onClick={add} disabled={saving} className="rounded-lg bg-[#0a3d62] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0c4a78] disabled:opacity-60">Add</button>
        </div>
      </div>
    </div>
  )
}
