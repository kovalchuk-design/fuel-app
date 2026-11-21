import { round2 } from './balance.ts'

export interface FuelRef { id: string; name: string; kind: 'fuel' | 'lubricant'; sort: number }
export interface SummaryGroup { title: string; rows: { fuelTypeId: string; name: string; liters: number }[]; total: number }
export interface FuelSummary { groups: SummaryGroup[]; total: number }

/** Категорія пального за назвою: бензин (А-80, А-92, А-95…) або дизельне пальне (ДП-…); мастила окремо. */
export function fuelCategory(f: Pick<FuelRef, 'name' | 'kind'>): string {
  if (f.kind === 'lubricant') return 'Мастила'
  return f.name.startsWith('А-') ? 'Бензин' : 'Дизельне пальне'
}

/** Зведення залишків по видах пального, згруповане за категоріями, із проміжними й загальним підсумком. */
export function summarizeByFuel(fuels: FuelRef[], balances: { fuelTypeId: string; opening: number }[]): FuelSummary {
  const sum = new Map<string, number>()
  for (const b of balances) sum.set(b.fuelTypeId, round2((sum.get(b.fuelTypeId) ?? 0) + b.opening))
  const order = ['Бензин', 'Дизельне пальне', 'Мастила']
  const groups = new Map<string, SummaryGroup>()
  for (const f of [...fuels].sort((a, b) => a.sort - b.sort)) {
    const title = fuelCategory(f)
    const liters = sum.get(f.id) ?? 0
    // Мастила показуємо, лише якщо є залишок; пальне — завжди (нулі потрібні для статистики).
    if (f.kind === 'lubricant' && liters === 0) continue
    const g = groups.get(title) ?? { title, rows: [], total: 0 }
    g.rows.push({ fuelTypeId: f.id, name: f.name, liters })
    g.total = round2(g.total + liters)
    groups.set(title, g)
  }
  const list = order.map((t) => groups.get(t)).filter((g): g is SummaryGroup => !!g)
  return { groups: list, total: round2(list.filter((g) => g.title !== 'Мастила').reduce((a, g) => a + g.total, 0)) }
}
