import { buildVehicleFuelRows, nextOpenings } from "./calc/index.ts"
import { supabase } from './supabase.ts'


export interface FuelType { id: string; name: string; kind: 'fuel' | 'lubricant'; sort: number }
export interface Vehicle { id: string; seq: number; name: string; vehicle_type: string | null; military_number: string | null; is_generator: boolean }
export interface VehicleFuel { vehicle_id: string; fuel_type_id: string }
export interface Period { id: string; date_from: string; date_to: string; label: string | null; status: 'draft' | 'closed' }
export interface ReceiptRow { id: string; period_id: string; fuel_type_id: string; liters: number; kg: number | null; doc_ref: string | null }
export interface WaybillRow {
  id: string; period_id: string; vehicle_id: string; fuel_type_id: string; number: string | null
  liters_used: number; liters_received: number; odometer_start: number | null; odometer_end: number | null
}
export interface BalanceRow { period_id: string; vehicle_id: string; fuel_type_id: string; opening: number; measured_closing: number | null }

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message)
  return res.data as T
}

export async function loadRefs() {
  const [fuels, vehicles, vf] = await Promise.all([
    supabase.from('fuel_types').select('*').order('sort'),
    supabase.from('vehicles').select('*').order('seq'),
    supabase.from('vehicle_fuels').select('*'),
  ])
  return { fuels: unwrap<FuelType[]>(fuels), vehicles: unwrap<Vehicle[]>(vehicles), vehicleFuels: unwrap<VehicleFuel[]>(vf) }
}

export const listPeriods = async () =>
  unwrap<Period[]>(await supabase.from('periods').select('*').order('date_from', { ascending: false }))

export const getPeriod = async (id: string) =>
  unwrap<Period>(await supabase.from('periods').select('*').eq('id', id).single())

export const listReceipts = async (periodId: string) =>
  unwrap<ReceiptRow[]>(await supabase.from('supplier_receipts').select('*').eq('period_id', periodId).order('fuel_type_id'))

export const listWaybills = async (periodId: string) =>
  unwrap<WaybillRow[]>(await supabase.from('waybills').select('*').eq('period_id', periodId))

export const listBalances = async (periodId: string) =>
  unwrap<BalanceRow[]>(await supabase.from('period_balances').select('*').eq('period_id', periodId))

export const insertRow = async (table: 'supplier_receipts' | 'waybills', row: Record<string, unknown>) =>
  unwrap(await supabase.from(table).insert(row).select())

export const deleteRow = async (table: 'supplier_receipts' | 'waybills', id: string) =>
  unwrap(await supabase.from(table).delete().eq('id', id).select())

export const saveBalance = async (b: BalanceRow) =>
  unwrap(await supabase.from('period_balances').upsert(b).select())

/** Створює період; початкові залишки беруться із закритих залишків найближчого попереднього періоду. */
export async function createPeriod(dateFrom: string, dateTo: string, label: string) {
  const period = unwrap<Period[]>(await supabase.from('periods').insert({ date_from: dateFrom, date_to: dateTo, label: label || null }).select())[0]
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
  }
  return period
}
