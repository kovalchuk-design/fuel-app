export interface Opening { vehicleId: string; fuelTypeId: string; opening: number }
export interface Waybill {
  vehicleId: string
  fuelTypeId: string
  litersUsed: number
  litersReceived: number
  odometerStart?: number | null
  odometerEnd?: number | null
}
export interface Receipt { fuelTypeId: string; liters: number }

/** Рядок «Розшифровки»: одна одиниця техніки × один вид пального. */
export interface VehicleFuelRow {
  vehicleId: string
  fuelTypeId: string
  opening: number
  received: number
  used: number
  closing: number
  odometerStart: number | null
  odometerEnd: number | null
  km: number | null
}

/** Рядок «Донесення»: зведення по виду пального. */
export interface FuelTotals {
  fuelTypeId: string
  opening: number
  received: number
  used: number
  closing: number
}

export interface ReconciliationRow {
  fuelTypeId: string
  supplier: number
  distributed: number
  diff: number
  ok: boolean
}

export interface Issue { code: 'negative_closing' | 'receipt_mismatch' | 'odometer_regress'; message: string; vehicleId?: string; fuelTypeId?: string }
