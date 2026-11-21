import { round2 } from './balance.ts'

/** Доступний обсяг одного виду пального (у порядку пріоритету списання). */
export interface FuelPool { fuelTypeId: string; available: number }
/** Одна витрата «загального дизелю» (напр. шляховий лист без уточнення виду). */
export interface GenericUse { id: string; liters: number }
export interface Allocation { useId: string; parts: { fuelTypeId: string; liters: number }[] }
export interface AllocationResult {
  allocations: Allocation[]
  /** Літри, яких не вистачило в жодному з видів пального. Більше 0 = помилка, документи блокуються. */
  shortage: number
  /** Скільки залишилось доступним по кожному виду після розподілу. */
  remaining: FuelPool[]
}

/**
 * Правило «загальний дизель» (docs/business-rules.md, правило 1).
 * Водії пишуть один загальний обсяг ДП-Л без поділу на В5 і В0. Розкладаємо його послідовно за пріоритетом:
 * спершу списуємо з першого виду (В5) до вичерпання доступного, решту з наступного (В0).
 * Доступне = залишок у баках на початок + надходження за період − уже списане за конкретним видом (по всій організації).
 */
export function allocateGenericUse(pools: FuelPool[], uses: GenericUse[]): AllocationResult {
  const left = pools.map((p) => ({ fuelTypeId: p.fuelTypeId, available: round2(Math.max(p.available, 0)) }))
  const allocations: Allocation[] = []
  let shortage = 0
  for (const use of uses) {
    let need = round2(use.liters)
    const parts: Allocation['parts'] = []
    for (const pool of left) {
      if (need <= 0) break
      const take = round2(Math.min(need, pool.available))
      if (take > 0) {
        parts.push({ fuelTypeId: pool.fuelTypeId, liters: take })
        pool.available = round2(pool.available - take)
        need = round2(need - take)
      }
    }
    shortage = round2(shortage + need)
    allocations.push({ useId: use.id, parts })
  }
  return { allocations, shortage, remaining: left }
}
