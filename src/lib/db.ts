import { buildVehicleFuelRows, nextOpenings, vehicleOdometers } from './calc/index.ts'
import { monthName } from './months.ts'
import { supabase } from './supabase.ts'


export interface FuelType { id: string; name: string; kind: 'fuel' | 'lubricant'; category: 'petrol' | 'diesel' | 'lubricant'; sort: number }
export interface Vehicle { id: string; seq: number; name: string; vehicle_type: string | null; military_number: string | null; unit: string; is_generator: boolean; fuel_class: 'petrol' | 'diesel'; report_group: 'a80' | 'a92_95' | 'diesel' }
export interface VehicleFuel { vehicle_id: string; fuel_type_id: string; position: number }
export interface Period { id: string; date_from: string; date_to: string; label: string | null; report_year: number; report_month: number; status: 'draft' | 'closed' }
export interface ReceiptRow { id: string; period_id: string; fuel_type_id: string; liters: number; kg: number | null; doc_ref: string | null }
export interface WaybillRow {
  id: string; period_id: string; vehicle_id: string; fuel_type_id: string; number: string | null
  liters_used: number; liters_received: number; odometer_start: number | null; odometer_end: number | null
}
export interface PeriodVehicle { period_id: string; vehicle_id: string; odometer_open: number | null }
export interface PeriodFuelKg { period_id: string; fuel_type_id: string; kg_open: number | null }
export interface BalanceRow { period_id: string; vehicle_id: string; fuel_type_id: string; opening: number; measured_closing: number | null }

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message)
  return res.data as T
}

export async function loadRefs() {
  const [fuels, vehicles, vf] = await Promise.all([
    supabase.from('fuel_types').select('*').order('sort'),
    supabase.from('vehicles').select('*').order('seq'),
    supabase.from('vehicle_fuels').select('*').order('position'),
  ])
  return { fuels: unwrap<FuelType[]>(fuels), vehicles: unwrap<Vehicle[]>(vehicles), vehicleFuels: unwrap<VehicleFuel[]>(vf) }
}

export const listPeriods = async () =>
  unwrap<Period[]>(await supabase.from('periods').select('*').order('report_year', { ascending: false }).order('report_month', { ascending: false }))

export const getPeriod = async (id: string) =>
  unwrap<Period>(await supabase.from('periods').select('*').eq('id', id).single())

export const listReceipts = async (periodId: string) =>
  unwrap<ReceiptRow[]>(await supabase.from('supplier_receipts').select('*').eq('period_id', periodId).order('fuel_type_id'))

export const listWaybills = async (periodId: string) =>
  unwrap<WaybillRow[]>(await supabase.from('waybills').select('*').eq('period_id', periodId))

export const listBalances = async (periodId: string) =>
  unwrap<BalanceRow[]>(await supabase.from('period_balances').select('*').eq('period_id', periodId))

export const listPeriodVehicles = async (periodId: string) =>
  unwrap<PeriodVehicle[]>(await supabase.from('period_vehicles').select('*').eq('period_id', periodId))

export const saveOdometerOpen = async (row: PeriodVehicle) =>
  unwrap(await supabase.from('period_vehicles').upsert(row).select())

export const listFuelKg = async (periodId: string) =>
  unwrap<PeriodFuelKg[]>(await supabase.from('period_fuel_kg').select('*').eq('period_id', periodId))

export const saveFuelKg = async (row: PeriodFuelKg) =>
  unwrap(await supabase.from('period_fuel_kg').upsert(row).select())

export const insertRow = async (table: 'supplier_receipts' | 'waybills', row: Record<string, unknown>) =>
  unwrap(await supabase.from(table).insert(row).select())

export const deleteRow = async (table: 'supplier_receipts' | 'waybills', id: string) =>
  unwrap(await supabase.from(table).delete().eq('id', id).select())

export const saveBalance = async (b: BalanceRow) =>
  unwrap(await supabase.from('period_balances').upsert(b).select())

/** Створює звіт за місяць; початкові залишки й спідометр беруться з найближчого попереднього звіту. */
export async function createPeriod(year: number, month: number, dateFrom: string, dateTo: string) {
  const period = unwrap<Period[]>(
    await supabase.from('periods').insert({ date_from: dateFrom, date_to: dateTo, label: monthName(month), report_year: year, report_month: month }).select(),
  )[0]
  const prev = unwrap<Period[]>(
    await supabase.from('periods').select('*').lt('date_from', dateFrom).neq('id', period.id).order('date_from', { ascending: false }).limit(1),
  )[0]
  if (prev) {
    const [bal, wb] = await Promise.all([listBalances(prev.id), listWaybills(prev.id)])
    const rows = buildVehicleFuelRows(
      bal.map((b) => ({ vehicleId: b.vehicle_id, fuelTypeId: b.fuel_type_id, opening: b.opening })),
      wb.map((w) => ({ vehicleId: w.vehicle_id, fuelTypeId: w.fuel_type_id, litersUsed: w.liters_used, litersReceived: w.liters_received })),
    )
    const openings = nextOpenings(rows).map((o) => ({ period_id: period.id, vehicle_id: o.vehicleId, fuel_type_id: o.fuelTypeId, opening: o.opening }))
    if (openings.length) unwrap(await supabase.from('period_balances').insert(openings).select())
    // Спідометр на початок = кінець попереднього періоду (макс. кінець із листів, або його початок, якщо машина стояла).
    const pv = await listPeriodVehicles(prev.id)
    const odo = vehicleOdometers(
      new Map(pv.map((x) => [x.vehicle_id, x.odometer_open])),
      wb.map((w) => ({ vehicleId: w.vehicle_id, odometerStart: w.odometer_start, odometerEnd: w.odometer_end })),
    )
    const carried = pv.map((x) => ({ period_id: period.id, vehicle_id: x.vehicle_id, odometer_open: odo(x.vehicle_id).end }))
    for (const w of wb) if (!pv.some((x) => x.vehicle_id === w.vehicle_id) && !carried.some((c) => c.vehicle_id === w.vehicle_id))
      carried.push({ period_id: period.id, vehicle_id: w.vehicle_id, odometer_open: odo(w.vehicle_id).end })
    if (carried.length) unwrap(await supabase.from('period_vehicles').insert(carried).select())
    // Кг на початок: переносяться лише для пального без руху за період (тоді залишок у кг не змінився);
    // де був рух, кг на кінець невідомі, і їх вводять вручну.
    const kg = await listFuelKg(prev.id)
    const moved = new Set<string>()
    for (const w of wb) if (w.liters_received || w.liters_used) moved.add(w.fuel_type_id)
    const kgCarried = kg.filter((k) => k.kg_open != null && !moved.has(k.fuel_type_id))
      .map((k) => ({ period_id: period.id, fuel_type_id: k.fuel_type_id, kg_open: k.kg_open }))
    if (kgCarried.length) unwrap(await supabase.from('period_fuel_kg').insert(kgCarried).select())
  }
  return period
}

export interface SettingsRow {
  unit_code: string
  supplier_unit_code: string
  explanation: string | null
  signatories: Record<string, { title: string; rank: string; name: string }>
}

export const getSettings = async () =>
  unwrap<SettingsRow>(await supabase.from('document_settings').select('*').eq('id', 1).single())

/** Видаляє період разом із його надходженнями, листами та залишками (каскад у БД). */
export const deletePeriod = async (id: string) =>
  unwrap(await supabase.from('periods').delete().eq('id', id).select())
