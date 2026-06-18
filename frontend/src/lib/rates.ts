import type {
  AddonTable,
  PlanResult,
  QuoteConfig,
  QuoteInputs,
  QuoteResult,
  VehicleTable,
} from './types'

const num = (v: unknown): number => {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : 0
}

function selectVehicleTable(config: QuoteConfig, isEv: boolean): VehicleTable {
  return isEv ? config.tables.ev : config.tables.motor
}

function selectAddonTable(table: VehicleTable, ncb: number): AddonTable {
  return ncb === 0 ? table.ncbZero : table.ncbPositive
}

function odRateForZone(config: QuoteConfig, zone: string): number {
  const found = config.odRateZones.find((z) => z.code === zone)
  return found ? found.rate : (config.odRateZones[0]?.rate ?? 0)
}

function computePlan(
  plan: string,
  idv: number,
  finalOdPremiumA: number,
  table: VehicleTable,
  addons: AddonTable,
  gstRate: number,
): PlanResult {
  const addonPremiums: Record<string, number | null> = {}
  let total = 0

  for (const addonName of table.addonOrder) {
    const cell = addons[addonName]?.[plan]
    if (!cell || cell.type === 'na') {
      addonPremiums[addonName] = null
      continue
    }
    if (cell.type === 'fixed') {
      addonPremiums[addonName] = cell.amount
      total += cell.amount
      continue
    }
    const value = idv * (cell.rate / 100)
    addonPremiums[addonName] = value
    total += value
  }

  const subtotal = finalOdPremiumA + total
  const gst = subtotal * (gstRate / 100)
  const finalPremiumRounded = Math.round(subtotal + gst)

  return {
    addonPremiums,
    totalAddonPremiumB: total,
    subtotal,
    gst,
    finalPremiumRounded,
  }
}

export function computeQuote(inputs: QuoteInputs, config: QuoteConfig): QuoteResult {
  const idv = num(inputs.idv)
  const odDiscount = num(inputs.odDiscount)
  const ncb = num(inputs.ncb)

  const odRate = odRateForZone(config, inputs.zone)
  const table = selectVehicleTable(config, inputs.isEv)
  const addons = selectAddonTable(table, ncb)

  const od = idv * (odRate / 100)
  const odDiscountAmt = od * (odDiscount / 100)
  const odAfterDiscount = od - odDiscountAmt
  const ncbAmt = odAfterDiscount * (ncb / 100)
  const finalOdPremiumA = odAfterDiscount - ncbAmt

  const plans: Record<string, PlanResult> = {}
  for (const plan of config.plans) {
    plans[plan] = computePlan(plan, idv, finalOdPremiumA, table, addons, config.gstRate)
  }

  return {
    base: { odRate, od, odDiscountAmt, odAfterDiscount, ncbAmt, finalOdPremiumA },
    plans,
    addonOrder: table.addonOrder,
  }
}

export const inr = (n: number): string =>
  new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Math.round(n))

export const inr2 = (n: number): string =>
  new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)

/** Pick the zone whose Platinum premium matches a saved quote (zone is not stored in DB). */
export function inferZoneForQuote(
  idv: number,
  odDiscount: number,
  ncb: number,
  isEv: boolean,
  config: QuoteConfig,
  platinumPremium: number,
): string {
  const target = Math.round(platinumPremium)
  for (const z of config.odRateZones) {
    const result = computeQuote({ idv, odDiscount, ncb, zone: z.code, isEv }, config)
    if (result.plans.Platinum?.finalPremiumRounded === target) return z.code
  }
  return config.odRateZones[0]?.code ?? 'A'
}
