import type { ReportInput } from './build.ts'

/** Жовтень 2026 (25.09–25.10) за наданою «Розшифровкою напрацювання»; ідентифікатори = назви. */
const FUELS = ['А-80', 'А-80 ДЗ', 'А-92 Євро 5 Е0', 'А-95 Євро 5 Е0', 'ДП-З Євро 5 В5', 'ДП-Л Євро 5 В5', 'ДП-Л Євро 5 В0', 'ДП-Л Євро 5 В0 (ДТ.Е К5 сорт Е)', 'ДП-Артика Євро 5 В0']
const [A80, A80DZ, A92, A95, DPZ, DPL5, DPL0, DPE, ART] = FUELS

type V = [seq: number, name: string, type: string, mil: string, gen: boolean]
const VEHICLES: V[] = [
  [1, 'ГАЗ 32213', 'пасажирська', '40-78 Т9', false], [2, 'Фольцваген', 'пасажирська', '40-77 Т9', false], [3, 'ЗІЛ ММЗ', 'грузовий', '40-81 Т9', false],
  [4, 'УАЗ 3962', 'санітарна', '40-79 Т9', false], [5, 'ГАЗ 66 (АП2)', 'санітарна', '40-75 Т9', false], [6, 'М-508', 'санітарна', '40-82 Т9', false],
  [7, 'Богдан 2251', 'санітарна', '40-80 Т9', false], [8, 'КАМАЗ 43101', 'грузовий', '40-84 Т9', false], [9, 'Сітроен Джампі', 'санітарна', '40-83 Т9', false],
  [10, 'Peugeot', 'легковий', '50-15 Т9', false], [11, 'Opel Vivaro', 'санітарна', '50-18 Т9', false], [12, 'Mercedes-Benz Sprinter', 'реанімобіль', '50-13 Т9', false],
  [13, 'Renault Kangoo', 'санітарна', '50-19 Т9', false], [14, 'IVECO EUROMIDI', 'пасажирський автобус', '50-17 Т9', false], [15, 'Ford Transit Custom', 'санітарна', '50-16 Т9', false],
  [16, 'IVECO C-50', 'санітарна', '50-14 Т9', false], [17, 'KIA K2500 AMBULANCE', 'санітарна', '40-76 Т9', false],
  [18, 'Генератор HIMOINSA HFW-400 320 кВт', 'інженерна', '231003142', true], [19, 'Електрогенератор PLASMA 50 кВт', 'інженерна', '448811', true],
  [20, 'Електрогенератор VIXIANG 50 кВт', 'інженерна', '805011', true], [21, 'Електрогенератор SDMO 70 кВт', 'інженерна', 'J 88K07000845', true],
  [22, 'Електроагрегат STRUVER KG 30 кВт', 'інженерна', '26360', true],
]

// [seq, пальне, залишок початок, отримано, використано]
const ROWS: [number, string, number, number, number][] = [
  [1, A92, 5, 0, 0], [1, A95, 0, 0, 0], [2, A95, 47, 160, 128], [2, A92, 0, 0, 0], [3, A80, 16, 0, 0], [3, A80DZ, 0, 90, 56], [4, A80DZ, 0, 0, 0],
  [5, A80DZ, 151, 200, 270], [6, DPL0, 49, 70, 70], [6, DPL5, 0, 10, 4], [7, DPL5, 15, 185, 167], [7, DPL0, 34, 0, 0], [8, DPL0, 8, 0, 0], [8, DPL5, 214, 0, 0],
  [9, DPL5, 38, 0, 12], [9, ART, 33, 0, 0], [10, DPL5, 14, 125, 106], [11, DPL5, 0, 160, 155], [11, DPL0, 34, 0, 0], [12, DPL0, 50, 0, 32], [12, ART, 37, 0, 0],
  [13, DPL5, 0, 130, 110], [13, DPL0, 14, 0, 0], [14, ART, 65, 0, 0], [14, DPL0, 19, 0, 8], [15, DPL5, 0, 180, 180], [15, DPL0, 74, 0, 9], [15, DPZ, 0, 0, 0],
  [16, DPL5, 0, 35, 35], [16, DPL0, 132, 227, 276], [17, DPL5, 0, 40, 36], [17, DPL0, 28, 0, 0], [18, DPL0, 1000, 0, 110], [18, DPZ, 1743, 0, 0],
  [19, ART, 200, 0, 0], [19, DPE, 113.5, 0, 0], [20, ART, 200, 0, 0], [20, DPE, 149.2, 0, 0], [21, ART, 200, 0, 0], [21, DPE, 113, 0, 0], [22, ART, 200, 0, 0], [22, DPE, 141, 0, 0],
]
const ODO: Record<number, [number, number]> = {
  1: [242969, 242969], 2: [557350, 559160], 3: [33523, 33647], 4: [1936, 1936], 5: [8549, 9508], 6: [548095, 548579], 7: [58602, 59900], 8: [36843, 36843],
  9: [25527, 25648], 10: [338204, 339121], 11: [276364, 277988], 12: [332270, 332473], 13: [222273, 223639], 14: [276239, 276266], 15: [268309, 270289],
  16: [341530, 343636], 17: [2293, 2621],
}

/** Залишок у кг на початок (колонка «Становить на 25.09.2026» вихідного Донесення). */
const KG_OPEN: Record<string, number> = { [A80DZ]: 118, [A80]: 22, [A92]: 4, [A95]: 35, [DPZ]: 1483, [DPL5]: 169, [DPL0]: 1279, [DPE]: 434 }

export function octoberFixture(): ReportInput {
  const vid = (s: number) => `v${s}`
  const vehicles = VEHICLES.map(([seq, name, vehicle_type, military_number, is_generator]) => ({ id: vid(seq), seq, name, vehicle_type, military_number, unit: 'ВМЗ', is_generator, fuel_class: (seq <= 5 ? 'petrol' : 'diesel') as 'petrol' | 'diesel',
    report_group: (seq <= 2 ? 'a92_95' : seq <= 5 ? 'a80' : 'diesel') as 'a80' | 'a92_95' | 'diesel' }))
  const fuels = FUELS.map((name, i) => ({ id: name, name, kind: 'fuel' as const, category: (name.startsWith('А-') ? 'petrol' : 'diesel') as 'petrol' | 'diesel', sort: i + 1 }))
  const posOf = new Map<number, number>()
  const vehicleFuels = ROWS.map(([s, f]) => { const p = (posOf.get(s) ?? 0) + 1; posOf.set(s, p); return { vehicle_id: vid(s), fuel_type_id: f, position: p } })
  const balances = ROWS.map(([s, f, o]) => ({ period_id: 'p', vehicle_id: vid(s), fuel_type_id: f, opening: o, measured_closing: null }))
  const withUse = ROWS.filter(([, , , r, u]) => r || u)
  const waybills = withUse.map(([s, f, , r, u], i) => ({
    id: `w${i}`, period_id: 'p', vehicle_id: vid(s), fuel_type_id: f, number: String(500 + s), liters_used: u, liters_received: r,
    odometer_start: ODO[s]?.[0] ?? null, odometer_end: ODO[s]?.[1] ?? null,
  }))
  const receipts = [[A80DZ, 290, 216], [A95, 160, 122], [DPL5, 865, 727], [DPL0, 297, 249]].map(([f, l, kg], i) => ({
    id: `r${i}`, period_id: 'p', fuel_type_id: f as string, liters: l as number, kg: kg as number | null, doc_ref: null,
  }))
  return {
    period: { id: 'p', date_from: '2026-09-25', date_to: '2026-10-25', label: 'жовтень', report_year: 2026, report_month: 10, status: 'draft' },
    vehicles, fuels, vehicleFuels, balances, receipts, waybills,
    fuelKg: Object.entries(KG_OPEN).map(([f, kg]) => ({ period_id: 'p', fuel_type_id: f, kg_open: kg })),
    periodVehicles: Object.entries(ODO).map(([s, [open]]) => ({ period_id: 'p', vehicle_id: vid(Number(s)), odometer_open: open })),
    settings: {
      unit_code: 'А1446', supplier_unit_code: 'А4240',
      explanation: 'Пально-мастильні матеріали: по графі №7 отримані зі складу пального військової частини А4240 по роздавальним відомостям. Фактична витрата відповідає встановленим нормам. Економії, перевитрати пально-мастильних матеріалів не має.',
      signatories: {
        commander: { title: 'Командир військової частини А1446', rank: 'підполковник м/с', name: 'Тимофій КУЛЬЧИЦЬКИЙ' },
        supply: { title: 'Начальник речової служби в/ч А1446', rank: 'майор', name: 'Олег ШЕВЧУК' },
        logistics: { title: 'Начальник логістики заступник начальника госпіталю в/ч А1446', rank: 'підполковник', name: 'Юрій ЯРОШЕНКО' },
        pmm: { title: 'Начальник служби ПММ військової частини А4240', rank: 'ст.лейтенант', name: 'Віктор ЛЕСИК' },
      },
    },
  }
}
