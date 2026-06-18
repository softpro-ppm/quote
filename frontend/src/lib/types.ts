export type PlanName = string

export type AddonRate =
  | { type: 'na' }
  | { type: 'percentOfIdv'; rate: number }
  | { type: 'fixed'; amount: number }

export type AddonTable = Record<string, Record<PlanName, AddonRate>>

export interface OdRateZone {
  code: string
  label: string
  rate: number
}

export interface VehicleTable {
  label: string
  addonOrder: string[]
  ncbPositive: AddonTable
  ncbZero: AddonTable
}

export interface QuoteConfig {
  gstRate: number
  plans: PlanName[]
  odRateZones: OdRateZone[]
  tables: {
    motor: VehicleTable
    ev: VehicleTable
  }
}

export interface QuoteInputs {
  idv: number
  odDiscount: number
  ncb: number
  zone: string
  isEv: boolean
}

export interface PlanResult {
  addonPremiums: Record<string, number | null>
  totalAddonPremiumB: number
  subtotal: number
  gst: number
  finalPremiumRounded: number
}

export interface QuoteResult {
  base: {
    odRate: number
    od: number
    odDiscountAmt: number
    odAfterDiscount: number
    ncbAmt: number
    finalOdPremiumA: number
  }
  plans: Record<PlanName, PlanResult>
  addonOrder: string[]
}

export interface Executive {
  id: number
  name: string
  email: string | null
  phone: string | null
  is_active: number
}

export interface Quote {
  id: number
  quote_number: string
  owner_name: string | null
  vehicle_number: string | null
  vehicle_model: string | null
  phone_number: string | null
  idv: string | number
  od_discount: string | number
  ncb: string | number
  executive_id: number | null
  gold_premium: string | number
  platinum_premium: string | number
  is_ev: number
  created_at: string
  updated_at: string
  latest_followup?: string | null
  latest_followup_date?: string | null
}
