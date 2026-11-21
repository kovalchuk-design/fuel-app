import { closingBalance, round2 } from './balance.ts'
import type {
  FuelTotals, Issue, Opening, Receipt, ReconciliationRow, VehicleFuelRow, Waybill,
} from './types.ts'

const key = (v: string, f: string) => `${v}|${f}`

/** Рядки по одиниця×пальне: початкові залишки + усі шляхові листи періоду (їх може бути кілька). */
export function buildVehicleFuelRows(openings: Opening[], waybills: Waybill[]): VehicleFuelRow[] {
  const rows = new Map<string, VehicleFuelRow>()
  const ensure = (vehicleId: string, fuelTypeId: string) => {
    const k = key(vehicleId, fuelTypeId)
    let r = rows.get(k)
    if (!r) {
      r = { vehicleId, fuelTypeId, opening: 0, received: 0, used: 0, closing: 0, odometerStart: null, odometerEnd: null, km: null }
      rows.set(k, r)
    }
    return r
  }
  for (const o of openings) ensure(o.vehicleId, o.fuelTypeId).opening = round2(o.opening)
  for (const w of waybills) {
    const r = ensure(w.vehicleId, w.fuelTypeId)
    r.received = round2(r.received + w.litersReceived)
    r.used = round2(r.used + w.litersUsed)
    if (w.odometerStart != null) r.odometerStart = r.odometerStart == null ? w.odometerStart : Math.min(r.odometerStart, w.odometerStart)
    if (w.odometerEnd != null) r.odometerEnd = r.odometerEnd == null ? w.odometerEnd : Math.max(r.odometerEnd, w.odometerEnd)
  }
  for (const r of rows.values()) {
    r.closing = closingBalance(r.opening, r.received, r.used)
    r.km = r.odometerStart != null && r.odometerEnd != null ? r.odometerEnd - r.odometerStart : null
  }
  return [...rows.values()]
}

/** Зведення для «Донесення»: по видах пального. «Отримано» = надходження від постачальника. */
export function aggregateByFuel(rows: VehicleFuelRow[], receipts: Receipt[]): FuelTotals[] {
  const t = new Map<string, FuelTotals>()
  const ensure = (fuelTypeId: string) => {
    let x = t.get(fuelTypeId)
    if (!x) { x = { fuelTypeId, opening: 0, received: 0, used: 0, closing: 0 }; t.set(fuelTypeId, x) }
    return x
  }
  for (const r of rows) {
    const x = ensure(r.fuelTypeId)
    x.opening = round2(x.opening + r.opening)
    x.used = round2(x.used + r.used)
  }
  for (const rc of receipts) {
    const x = ensure(rc.fuelTypeId)
    x.received = round2(x.received + rc.liters)
  }
  for (const x of t.values()) x.closing = closingBalance(x.opening, x.received, x.used)
  return [...t.values()]
}

/** Звірка: сума «Отримано» по одиницях = надходження від постачальника по кожному виду пального. */
export function reconcileReceipts(rows: VehicleFuelRow[], receipts: Receipt[]): ReconciliationRow[] {
  const supplier = new Map<string, number>()
  const distributed = new Map<string, number>()
  for (const rc of receipts) supplier.set(rc.fuelTypeId, round2((supplier.get(rc.fuelTypeId) ?? 0) + rc.liters))
  for (const r of rows) distributed.set(r.fuelTypeId, round2((distributed.get(r.fuelTypeId) ?? 0) + r.received))
  const ids = new Set([...supplier.keys(), ...distributed.keys()])
  return [...ids].map((fuelTypeId) => {
    const s = supplier.get(fuelTypeId) ?? 0
    const d = distributed.get(fuelTypeId) ?? 0
    const diff = round2(s - d)
    return { fuelTypeId, supplier: s, distributed: d, diff, ok: diff === 0 }
  })
}

/** Перевірки, що блокують генерацію: розбіжність надходжень, мінусовий залишок, спідометр назад. */
export function validatePeriod(rows: VehicleFuelRow[], receipts: Receipt[], waybills: Waybill[]): Issue[] {
  const issues: Issue[] = []
  for (const r of rows) {
    if (r.closing < 0) issues.push({ code: 'negative_closing', message: `Від'ємний залишок ${r.closing} л`, vehicleId: r.vehicleId, fuelTypeId: r.fuelTypeId })
  }
  for (const rec of reconcileReceipts(rows, receipts)) {
    if (!rec.ok) issues.push({ code: 'receipt_mismatch', message: `Надходження ${rec.supplier} л ≠ розподілено ${rec.distributed} л (різниця ${rec.diff})`, fuelTypeId: rec.fuelTypeId })
  }
  for (const w of waybills) {
    if (w.odometerStart != null && w.odometerEnd != null && w.odometerEnd < w.odometerStart) {
      issues.push({ code: 'odometer_regress', message: 'Спідометр на кінці менший за початок', vehicleId: w.vehicleId, fuelTypeId: w.fuelTypeId })
    }
  }
  return issues
}

/** Початкові залишки наступного періоду = закриті залишки поточного. */
export function nextOpenings(rows: VehicleFuelRow[]): Opening[] {
  return rows.map((r) => ({ vehicleId: r.vehicleId, fuelTypeId: r.fuelTypeId, opening: r.closing }))
}
