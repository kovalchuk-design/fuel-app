import { describe, expect, it } from 'vitest'
import { allocateGenericUse } from './allocate.ts'

const V5 = 'dpl-v5', V0 = 'dpl-v0'
const pools = (a5: number, a0: number) => [{ fuelTypeId: V5, available: a5 }, { fuelTypeId: V0, available: a0 }]

describe('правило «загальний дизель»', () => {
  it('приклад із ТЗ: надійшло 70 В5 і 100 В0, водій 80 л → 70 з В5 і 10 з В0', () => {
    const r = allocateGenericUse(pools(70, 100), [{ id: 'w1', liters: 80 }])
    expect(r.allocations[0].parts).toEqual([{ fuelTypeId: V5, liters: 70 }, { fuelTypeId: V0, liters: 10 }])
    expect(r.shortage).toBe(0)
    expect(r.remaining).toEqual([{ fuelTypeId: V5, available: 0 }, { fuelTypeId: V0, available: 90 }])
  })

  it('залишок у баках на початок додається до надходження: 20 + 70 = 90 → увесь 80 л з В5', () => {
    const r = allocateGenericUse(pools(20 + 70, 100), [{ id: 'w1', liters: 80 }])
    expect(r.allocations[0].parts).toEqual([{ fuelTypeId: V5, liters: 80 }])
    expect(r.remaining[0].available).toBe(10)
  })

  it('кілька витрат йдуть по черзі: 50 → В5; 30 → 20 з В5 і 10 з В0', () => {
    const r = allocateGenericUse(pools(70, 100), [{ id: 'a', liters: 50 }, { id: 'b', liters: 30 }])
    expect(r.allocations[0].parts).toEqual([{ fuelTypeId: V5, liters: 50 }])
    expect(r.allocations[1].parts).toEqual([{ fuelTypeId: V5, liters: 20 }, { fuelTypeId: V0, liters: 10 }])
  })

  it('витрата менша за В5: В0 не чіпаємо', () => {
    const r = allocateGenericUse(pools(70, 100), [{ id: 'a', liters: 40 }])
    expect(r.allocations[0].parts).toEqual([{ fuelTypeId: V5, liters: 40 }])
    expect(r.remaining[1].available).toBe(100)
  })

  it('не вистачає і В5, і В0: 200 > 170 → нестача 30 (помилка, документи блокуються)', () => {
    const r = allocateGenericUse(pools(70, 100), [{ id: 'a', liters: 200 }])
    expect(r.shortage).toBe(30)
    expect(r.allocations[0].parts).toEqual([{ fuelTypeId: V5, liters: 70 }, { fuelTypeId: V0, liters: 100 }])
  })

  it('від’ємний доступний обсяг рахується як 0; дробові літри без похибки', () => {
    const r = allocateGenericUse(pools(-5, 0.3), [{ id: 'a', liters: 0.1 }, { id: 'b', liters: 0.2 }])
    expect(r.shortage).toBe(0)
    expect(r.allocations.flatMap((x) => x.parts).every((p) => p.fuelTypeId === V0)).toBe(true)
    expect(r.remaining[1].available).toBe(0)
  })
})
