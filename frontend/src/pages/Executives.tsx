import { useCallback, useEffect, useState } from 'react'
import { api, apiErrorMessage } from '../lib/api'
import type { Executive } from '../lib/types'

interface EditState {
  id: number | null
  name: string
  email: string
  phone: string
  is_active: boolean
}

const empty: EditState = { id: null, name: '', email: '', phone: '', is_active: true }

export default function Executives() {
  const [items, setItems] = useState<Executive[]>([])
  const [edit, setEdit] = useState<EditState>(empty)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/executives')
      setItems(res.data.data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const save = async () => {
    setError(null)
    if (!edit.name.trim()) {
      setError('Name is required')
      return
    }
    const payload = {
      name: edit.name.trim(),
      email: edit.email || null,
      phone: edit.phone || null,
      is_active: edit.is_active ? 1 : 0,
    }
    try {
      if (edit.id) await api.put(`/executives/${edit.id}`, payload)
      else await api.post('/executives', payload)
      setEdit(empty)
      void load()
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not save executive'))
    }
  }

  const remove = async (id: number) => {
    if (!confirm('Delete this executive?')) return
    try {
      await api.delete(`/executives/${id}`)
      void load()
    } catch (err) {
      alert(apiErrorMessage(err, 'Could not delete'))
    }
  }

  const inputCls = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500'

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-slate-700">{edit.id ? 'Edit Executive' : 'Add Executive'}</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <input className={inputCls} placeholder="Name" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
          <input className={inputCls} placeholder="Email" value={edit.email} onChange={(e) => setEdit({ ...edit, email: e.target.value })} />
          <input className={inputCls} placeholder="Phone" value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} />
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={edit.is_active} onChange={(e) => setEdit({ ...edit, is_active: e.target.checked })} />
            Active
          </label>
        </div>
        {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
        <div className="mt-3 flex gap-2">
          <button onClick={save} className="rounded-lg bg-[#0a3d62] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0c4a78]">{edit.id ? 'Update' : 'Add'}</button>
          {edit.id && <button onClick={() => setEdit(empty)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>}
        </div>
      </section>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Name</th>
              <th className="px-3 py-2 text-left font-medium">Email</th>
              <th className="px-3 py-2 text-left font-medium">Phone</th>
              <th className="px-3 py-2 text-center font-medium">Active</th>
              <th className="px-3 py-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-400">Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-400">No executives yet.</td></tr>
            ) : (
              items.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50/60">
                  <td className="px-3 py-2 font-medium text-slate-700">{e.name}</td>
                  <td className="px-3 py-2 text-slate-600">{e.email ?? '-'}</td>
                  <td className="px-3 py-2 text-slate-600">{e.phone ?? '-'}</td>
                  <td className="px-3 py-2 text-center">{e.is_active ? '✓' : '—'}</td>
                  <td className="px-3 py-2 text-right">
                    <button onClick={() => setEdit({ id: e.id, name: e.name, email: e.email ?? '', phone: e.phone ?? '', is_active: Boolean(e.is_active) })} className="text-sky-600 hover:underline">Edit</button>
                    <button onClick={() => remove(e.id)} className="ml-3 text-rose-500 hover:underline">Delete</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
