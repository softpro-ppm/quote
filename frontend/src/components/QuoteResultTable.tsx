import { inr } from '../lib/rates'
import type { PlanName, QuoteResult } from '../lib/types'

export default function QuoteResultTable({
  result,
  plans,
}: {
  result: QuoteResult
  plans: PlanName[]
}) {
  const { base } = result

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="text-base font-semibold text-slate-800">Premium Breakdown</h2>
        <p className="text-xs text-slate-500">
          OD Rate {base.odRate}% · Final OD (A) ₹{inr(base.finalOdPremiumA)} after discount & NCB
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-2 text-left font-medium">Add-on</th>
              {plans.map((p) => (
                <th key={p} className="px-4 py-2 text-right font-medium">
                  {p}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            <tr className="bg-sky-50/40">
              <td className="px-4 py-2 font-medium text-slate-700">Own Damage Premium (A)</td>
              {plans.map((p) => (
                <td key={p} className="px-4 py-2 text-right text-slate-700">
                  ₹{inr(base.finalOdPremiumA)}
                </td>
              ))}
            </tr>
            {result.addonOrder.map((addon) => (
              <tr key={addon}>
                <td className="px-4 py-2 text-slate-700">{addon}</td>
                {plans.map((p) => {
                  const val = result.plans[p]?.addonPremiums[addon]
                  return (
                    <td key={p} className="px-4 py-2 text-right text-slate-600">
                      {val == null ? <span className="text-slate-300">—</span> : `₹${inr(val)}`}
                    </td>
                  )
                })}
              </tr>
            ))}
            <tr className="bg-slate-50">
              <td className="px-4 py-2 font-medium text-slate-700">Add-on Total (B)</td>
              {plans.map((p) => (
                <td key={p} className="px-4 py-2 text-right font-medium text-slate-700">
                  ₹{inr(result.plans[p]?.totalAddonPremiumB ?? 0)}
                </td>
              ))}
            </tr>
            <tr>
              <td className="px-4 py-2 text-slate-700">Sub Total (A + B)</td>
              {plans.map((p) => (
                <td key={p} className="px-4 py-2 text-right text-slate-600">
                  ₹{inr(result.plans[p]?.subtotal ?? 0)}
                </td>
              ))}
            </tr>
            <tr>
              <td className="px-4 py-2 text-slate-700">GST</td>
              {plans.map((p) => (
                <td key={p} className="px-4 py-2 text-right text-slate-600">
                  ₹{inr(result.plans[p]?.gst ?? 0)}
                </td>
              ))}
            </tr>
            <tr className="bg-[#0a3d62] text-white">
              <td className="px-4 py-3 font-semibold">Total Premium</td>
              {plans.map((p) => (
                <td key={p} className="px-4 py-3 text-right text-base font-bold">
                  ₹{inr(result.plans[p]?.finalPremiumRounded ?? 0)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  )
}
