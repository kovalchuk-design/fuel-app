import { aggregateByFuel, buildVehicleFuelRows, round2, vehicleOdometers, type VehicleFuelRow } from '../calc/index.ts'
import type { BalanceRow, FuelType, Period, PeriodVehicle, ReceiptRow, Vehicle, VehicleFuel, WaybillRow } from '../db.ts'
import { cell, type DCell, type DocModel, type Signature } from './model.ts'

export interface SignatoryDef { title: string; rank: string; name: string }
export interface DocSettings {
  unit_code: string
  supplier_unit_code: string
  explanation: string | null
  signatories: Record<string, SignatoryDef>
}
export interface ReportInput {
  period: Period
  vehicles: Vehicle[]
  fuels: FuelType[]
  vehicleFuels: VehicleFuel[]
  balances: BalanceRow[]
  periodVehicles: PeriodVehicle[]
  receipts: ReceiptRow[]
  waybills: WaybillRow[]
  settings: DocSettings
}

const dmy = (iso: string, short = false) => {
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${short ? y.slice(2) : y}`
}
const period = (p: Period, short = false) =>
  `з ${dmy(p.date_from, short)} по ${dmy(p.date_to, short)}${short ? '' : ' року'}${p.label ? ` (${p.label})` : ''}`
const n = (v: number | null | undefined) => (v == null ? '' : String(round2(v)).replace('.', ','))
const nz = (v: number) => (v === 0 ? '0' : n(v))

function computed(inp: ReportInput) {
  const rows = buildVehicleFuelRows(
    inp.balances.map((b) => ({ vehicleId: b.vehicle_id, fuelTypeId: b.fuel_type_id, opening: b.opening })),
    inp.waybills.map((w) => ({
      vehicleId: w.vehicle_id, fuelTypeId: w.fuel_type_id, litersUsed: w.liters_used, litersReceived: w.liters_received,
      odometerStart: w.odometer_start, odometerEnd: w.odometer_end,
    })),
  )
  const receipts = inp.receipts.map((r) => ({ fuelTypeId: r.fuel_type_id, liters: r.liters }))
  return { rows, receipts, totals: aggregateByFuel(rows, receipts) }
}

const fOrder = (inp: ReportInput) => new Map(inp.fuels.map((f) => [f.id, f.sort]))
const fname = (inp: ReportInput, id: string) => inp.fuels.find((f) => f.id === id)?.name ?? id
/**
 * Рядки по одиниця×пальне у порядку документа. Показуються ВСІ дозволені пари машини, також із нулями
 * (потрібні для статистики), у порядку `position`; пара з даними поза довідником теж потрапляє в документ.
 */
function orderedRows(inp: ReportInput, rows: VehicleFuelRow[]): VehicleFuelRow[] {
  const byPair = new Map(rows.map((r) => [`${r.vehicleId}|${r.fuelTypeId}`, r]))
  const fo = fOrder(inp)
  const out: VehicleFuelRow[] = []
  for (const v of [...inp.vehicles].sort((a, b) => a.seq - b.seq)) {
    const pairs = inp.vehicleFuels.filter((vf) => vf.vehicle_id === v.id)
      .sort((a, b) => (a.position - b.position) || (fo.get(a.fuel_type_id)! - fo.get(b.fuel_type_id)!))
      .map((vf) => vf.fuel_type_id)
    const extra = rows.filter((r) => r.vehicleId === v.id && !pairs.includes(r.fuelTypeId)).map((r) => r.fuelTypeId)
    for (const f of [...pairs, ...extra]) {
      out.push(byPair.get(`${v.id}|${f}`) ?? { vehicleId: v.id, fuelTypeId: f, opening: 0, received: 0, used: 0, closing: 0, odometerStart: null, odometerEnd: null, km: null })
    }
  }
  return out
}

/** Спідометр належить машині: початок із періоду (або мін. із листів), кінець — макс. із листів. */
function odometers(inp: ReportInput): (vehicleId: string) => { start: number | null; end: number | null } {
  return vehicleOdometers(
    new Map(inp.periodVehicles.map((x) => [x.vehicle_id, x.odometer_open])),
    inp.waybills.map((w) => ({ vehicleId: w.vehicle_id, odometerStart: w.odometer_start, odometerEnd: w.odometer_end })),
  )
}

const sig = (s: SignatoryDef | undefined, heading?: string): Signature[] => (s ? [{ heading, ...s }] : [])

/** Розшифровка напрацювання техніки та витрати ПММ. */
export function buildRaspiska(inp: ReportInput): DocModel {
  const { rows, totals } = computed(inp)
  const list = orderedRows(inp, rows)
  const veh = new Map(inp.vehicles.map((v) => [v.id, v]))
  const odo = odometers(inp)
  const body: DCell[][] = []
  const span = new Map<string, number>()
  for (const r of list) span.set(r.vehicleId, (span.get(r.vehicleId) ?? 0) + 1)
  let prev = ''
  for (const r of list) {
    const v = veh.get(r.vehicleId)!
    const first = prev !== r.vehicleId
    prev = r.vehicleId
    const rs = span.get(v.id)!
    const o = odo(v.id)
    // Колонки, що стосуються машини, об'єднуються на всі її рядки пального і центруються.
    body.push([
      ...(first ? [cell(v.seq, { rowSpan: rs }), cell(v.name, { rowSpan: rs }), cell(v.military_number ?? '', { rowSpan: rs }),
        cell(n(o.start), { rowSpan: rs }), cell(n(o.end), { rowSpan: rs })] : []),
      cell(fname(inp, r.fuelTypeId)), cell(nz(r.opening)), cell(r.received ? n(r.received) : ''),
      cell(r.used ? n(r.used) : ''), cell(r.used ? n(r.used) : ''), cell(nz(r.closing)), cell(''), cell(''),
    ])
  }
  const fo = fOrder(inp)
  for (const t of [...totals].sort((a, b) => fo.get(a.fuelTypeId)! - fo.get(b.fuelTypeId)!)) {
    if (!(t.opening || t.received || t.used || t.closing)) continue
    body.push([
      cell(''), cell('ВСЬОГО', { bold: true }), cell(''), cell(''), cell(''), cell(fname(inp, t.fuelTypeId), { bold: true }),
      cell(nz(t.opening), { bold: true }), cell(t.received ? n(t.received) : '', { bold: true }),
      cell(t.used ? n(t.used) : '', { bold: true }), cell(t.used ? n(t.used) : '', { bold: true }), cell(nz(t.closing), { bold: true }), cell(''), cell(''),
    ])
  }
  const h = (t: string, o: Partial<DCell> = {}) => cell(t, { bold: true, align: 'center', ...o })
  return {
    id: 'raspiska',
    fileName: `Розшифровка ${dmy(inp.period.date_from)}-${dmy(inp.period.date_to)}`,
    colWidths: [4, 15, 9, 8, 8, 16, 8, 8, 10, 10.5, 8, 8.5, 8],
    before: [
      { text: 'Розшифровка напрацювання техніки та витрати ПММ', align: 'center', bold: true, size: 13 },
      { text: `за військову частину ${inp.settings.unit_code} в період ${period(inp.period, true)}`, align: 'center', size: 11 },
    ],
    header: [
      [h('№ п/п', { rowSpan: 2 }), h('Марка автомобіля', { rowSpan: 2 }), h('Військовий номер', { rowSpan: 2 }), h('Показник спідометра', { colSpan: 2 }),
        h('Марка ПММ', { rowSpan: 2 }), h('Залишок на початок місяця', { rowSpan: 2 }), h('Отримано', { rowSpan: 2 }), h('Фактично використ.', { rowSpan: 2 }),
        h('Використано згідно норм', { rowSpan: 2 }), h('Залишок на кінець місяця', { rowSpan: 2 }), h('Економія', { rowSpan: 2 }), h('Примітка', { rowSpan: 2 })],
      [h('Початок місяця'), h('Кінець місяця')],
    ],
    body,
    bodyAlign: ['center', 'center', 'center', 'center', 'center', 'center', 'center', 'center', 'center', 'center', 'center', 'center', 'center'],
    after: [],
    signatures: sig(inp.settings.signatories.logistics),
  }
}

/** Відомість заміру автомобільного пального в баках машин. */
export function buildVidomist(inp: ReportInput): DocModel {
  const { rows } = computed(inp)
  const list = orderedRows(inp, rows)
  const veh = new Map(inp.vehicles.map((v) => [v.id, v]))
  const meas = new Map(inp.balances.map((b) => [`${b.vehicle_id}|${b.fuel_type_id}`, b.measured_closing]))
  const odo = odometers(inp)
  const lastNo = new Map<string, string>()
  for (const w of inp.waybills) if (w.number) lastNo.set(w.vehicle_id, w.number)
  const body: DCell[][] = []
  const sumByFuel = new Map<string, { calc: number; fact: number }>()
  const span = new Map<string, number>()
  for (const r of list) span.set(r.vehicleId, (span.get(r.vehicleId) ?? 0) + 1)
  let prev = ''
  for (const r of list) {
    const v = veh.get(r.vehicleId)!
    const first = prev !== r.vehicleId
    prev = r.vehicleId
    const rs = span.get(v.id)!
    const fact = meas.get(`${r.vehicleId}|${r.fuelTypeId}`) ?? r.closing
    const diff = round2(fact - r.closing)
    const s = sumByFuel.get(r.fuelTypeId) ?? { calc: 0, fact: 0 }
    sumByFuel.set(r.fuelTypeId, { calc: round2(s.calc + r.closing), fact: round2(s.fact + fact) })
    // Колонки машини (№, підрозділ, марка, тип, номер, № листа, спідометр) об'єднані на всі рядки пального.
    // Порядок колонок: № | Підрозділ | Пальне | Марка | Тип | Номер | № листа | Рахується | Фактично | Надлишок | Нестача | Спідометр
    const pieces = {
      seq: cell(v.seq, { rowSpan: rs }), unit: cell(v.unit, { rowSpan: rs }), name: cell(v.name, { rowSpan: rs }),
      type: cell(v.vehicle_type ?? '', { rowSpan: rs }), mil: cell(v.military_number ?? '', { rowSpan: rs }),
      last: cell(lastNo.get(v.id) ?? '', { rowSpan: rs }), odo: cell(n(odo(v.id).end), { rowSpan: rs }),
    }
    body.push([
      ...(first ? [pieces.seq, pieces.unit] : []),
      cell(fname(inp, r.fuelTypeId)),
      ...(first ? [pieces.name, pieces.type, pieces.mil, pieces.last] : []),
      cell(nz(r.closing)), cell(nz(fact)), cell(diff > 0 ? n(diff) : '–'), cell(diff < 0 ? n(-diff) : '–'),
      ...(first ? [pieces.odo] : []),
    ])
  }
  const fo = fOrder(inp)
  for (const [fid, s] of [...sumByFuel].sort((a, b) => fo.get(a[0])! - fo.get(b[0])!)) {
    if (!s.calc && !s.fact) continue
    body.push([cell(''), cell(''), cell(fname(inp, fid), { bold: true }), cell('ВСЬОГО', { bold: true }), cell(''), cell(''), cell(''),
      cell(nz(s.calc), { bold: true }), cell(nz(s.fact), { bold: true }), cell(''), cell(''), cell('')])
  }
  const h = (t: string, o: Partial<DCell> = {}) => cell(t, { bold: true, align: 'center', ...o })
  return {
    id: 'vidomist',
    fileName: `Відомість заміру ${dmy(inp.period.date_to)}`,
    colWidths: [4, 7, 17, 14, 11, 10, 9, 9, 9, 8.5, 9.5, 10],
    before: [
      { text: 'В І Д О М І С Т Ь', align: 'center', bold: true, size: 13 },
      { text: `заміру автомобільного пального поточного забезпечення в баках машин військової частини ${inp.settings.unit_code}`, align: 'center', size: 11 },
      { text: `за станом на ${dmy(inp.period.date_to)}${inp.period.label ? ` (${inp.period.label})` : ''}`, align: 'center', size: 11 },
    ],
    header: [
      [h('№ з/п'), h('Підрозділ'), h('Найменування пального'), h('Марка машини'), h('Тип машини'),
        h('Заводський (військовий) номер'), h('№ останнього шляхового листа'),
        h('Рахується за шляховим листом, літрів'), h('Фактично є в наявності, літрів'),
        h('Надлишок, літрів'), h('Невистачає, літрів'), h('Примітка (спідометр)')],
    ],
    body,
    bodyAlign: ['center', 'center', 'center', 'center', 'center', 'center', 'center', 'center', 'center', 'center', 'center', 'center'],
    after: [],
    signatures: sig(inp.settings.signatories.logistics),
  }
}

/** Донесення про наявність та проходження матеріальних засобів (Додаток 17). */
export function buildDonesennya(inp: ReportInput): DocModel {
  const { rows, totals } = computed(inp)
  const gen = new Set(inp.vehicles.filter((v) => v.is_generator).map((v) => v.id))
  const fo = fOrder(inp)
  const body: DCell[][] = []
  let no = 0
  const density = new Map<string, number>()
  const sums = new Map<string, { l: number; kg: number }>()
  for (const r of inp.receipts) {
    const s = sums.get(r.fuel_type_id) ?? { l: 0, kg: 0 }
    if (r.kg) sums.set(r.fuel_type_id, { l: s.l + r.liters, kg: s.kg + r.kg })
  }
  for (const [f, s] of sums) density.set(f, s.kg / s.l)
  const kgOf = (f: string, l: number) => (density.has(f) ? n(Math.round(l * density.get(f)!)) : '–')
  for (const t of [...totals].sort((a, b) => fo.get(a.fuelTypeId)! - fo.get(b.fuelTypeId)!)) {
    if (!(t.opening || t.received || t.used || t.closing)) continue
    const fid = t.fuelTypeId
    const byWaybill = round2(rows.filter((r) => r.fuelTypeId === fid && !gen.has(r.vehicleId)).reduce((a, r) => a + r.used, 0))
    const byAgg = round2(t.used - byWaybill)
    const recKg = inp.receipts.filter((r) => r.fuel_type_id === fid).reduce((a, r) => a + (r.kg ?? 0), 0)
    no++
    body.push([
      cell(no, { rowSpan: 2 }), cell(fname(inp, fid), { rowSpan: 2 }), cell('л'), cell(nz(t.opening)), cell(nz(t.received)), cell(nz(byWaybill)), cell(nz(byAgg)), cell(nz(t.used)),
      cell(nz(t.closing)), cell(nz(t.used)), cell('0'), cell('0'),
    ])
    body.push([
      cell('кг'), cell(kgOf(fid, t.opening)), cell(recKg ? n(recKg) : kgOf(fid, t.received)), cell(kgOf(fid, byWaybill)),
      cell(kgOf(fid, byAgg)), cell(kgOf(fid, t.used)), cell(kgOf(fid, t.closing)), cell(''), cell(''), cell('')
    ])
  }
  const s = inp.settings.signatories
  const h = (t: string, o: Partial<DCell> = {}) => cell(t, { bold: true, align: 'center', ...o })
  return {
    id: 'donesennya',
    fileName: `Донесення ${dmy(inp.period.date_from)}-${dmy(inp.period.date_to)}`,
    colWidths: [4, 19, 5, 9, 9, 10, 10, 9, 9, 9, 8.5, 9.5],
    before: [
      { text: 'Додаток 17', align: 'right', size: 9 },
      { text: 'до Інструкції з обліку військового майна у Збройних Силах України (пункт 13 розділу ІV)', align: 'right', size: 9 },
      { text: 'Д О Н Е С Е Н Н Я   №', align: 'center', bold: true, size: 13 },
      { text: 'про наявність та проходження матеріальних засобів', align: 'center', size: 11 },
      { text: `за в/ч ${inp.settings.unit_code} в період ${period(inp.period)}`, align: 'center', size: 11 },
      { text: `Підстава (мета) операції: списання.  Кому: ФЕС, ПММ (військова частина ${inp.settings.supplier_unit_code}).  Від кого: в/ч ${inp.settings.unit_code}, служба ПММ`, align: 'left', size: 9 },
    ],
    header: [
      [h('№ з/п', { rowSpan: 2 }), h('Найменування військового майна', { rowSpan: 2 }), h('Од. виміру', { rowSpan: 2 }),
        h(`Становить на ${dmy(inp.period.date_from)}`, { rowSpan: 2 }), h(`Прибуло зі складу в/ч ${inp.settings.supplier_unit_code}`, { rowSpan: 2 }),
        h('Вибуло', { colSpan: 3 }), h(`Становить на ${dmy(inp.period.date_to)}`, { rowSpan: 2 }),
        h('Належить використати за нормою', { rowSpan: 2 }), h('Економія', { rowSpan: 2 }), h('Перевитрата', { rowSpan: 2 })],
      [h('По шляхових листах'), h('По робочих листах агрегатів'), h('Усього')],
    ],
    body,
    bodyAlign: ['center', 'center', 'center', 'center', 'center', 'center', 'center', 'center', 'center', 'center', 'center', 'center'],
    after: [
      { text: `Контрольне число: ${no} (порядкових номерів)`, align: 'left', size: 9, bold: true },
      { text: `Пояснення: ${inp.settings.explanation ?? ''}`, align: 'left', size: 9 },
    ],
    signatures: [
      ...sig(s.commander), ...sig(s.supply), ...sig(s.logistics), ...sig(s.pmm, 'ПОГОДЖЕНО:'),
    ],
  }
}

export const buildAll = (inp: ReportInput) => [buildVidomist(inp), buildRaspiska(inp), buildDonesennya(inp)]
