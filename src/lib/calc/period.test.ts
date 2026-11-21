import { describe, expect, it } from 'vitest'
import { aggregateByFuel, buildVehicleFuelRows, nextOpenings, reconcileReceipts, validatePeriod } from './period.ts'
import type { Waybill } from './types.ts'

const A95 = 'a95', DPL5 = 'dpl-v5', ZIL = 'zil', BOG = 'bogdan', OPEL = 'opel'

// Дані з жовтня 2026 (Розшифровка): Богдан 15+185−167=33, Опель 0+160−155=5, Пежо 14+125−106=33 (ДП-Л В5)
const openings = [
  { vehicleId: BOG, fuelTypeId: DPL5, opening: 15 },
  { vehicleId: OPEL, fuelTypeId: DPL5, opening: 0 },
  { vehicleId: 'peugeot', fuelTypeId: DPL5, opening: 14 },
  { vehicleId: 'vw', fuelTypeId: A95, opening: 47 },
]
const waybills: Waybill[] = [
  { vehicleId: BOG, fuelTypeId: DPL5, litersReceived: 100, litersUsed: 80, odometerStart: 58602, odometerEnd: 59100 },
  { vehicleId: BOG, fuelTypeId: DPL5, litersReceived: 85, litersUsed: 87, odometerStart: 59100, odometerEnd: 59900 },
  { vehicleId: OPEL, fuelTypeId: DPL5, litersReceived: 160, litersUsed: 155 },
  { vehicleId: 'peugeot', fuelTypeId: DPL5, litersReceived: 125, litersUsed: 106 },
  { vehicleId: 'vw', fuelTypeId: A95, litersReceived: 160, litersUsed: 128 },
]

describe('buildVehicleFuelRows', () => {
  const rows = buildVehicleFuelRows(openings, waybills)
  const bog = rows.find((r) => r.vehicleId === BOG)!
  it('сумує кілька шляхових листів одного авто', () => {
    expect(bog.received).toBe(185)
    expect(bog.used).toBe(167)
    expect(bog.closing).toBe(33)
  })
  it('пробіг: мін. початок, макс. кінець (58602→59900 = 1298 км)', () => {
    expect(bog.km).toBe(1298)
  })
  it('без спідометра km = null (генератори)', () => {
    expect(rows.find((r) => r.vehicleId === OPEL)!.km).toBeNull()
  })
  it('включає авто без листів з початковим залишком', () => {
    const r = buildVehicleFuelRows([{ vehicleId: ZIL, fuelTypeId: 'a80', opening: 16 }], [])
    expect(r[0]).toMatchObject({ opening: 16, used: 0, closing: 16 })
  })
})

describe('aggregateByFuel (Донесення, ДП-Л В5)', () => {
  it('29 + 470 − 428 = 71', () => {
    const rows = buildVehicleFuelRows(openings, waybills)
    const t = aggregateByFuel(rows, [{ fuelTypeId: DPL5, liters: 470 }]).find((x) => x.fuelTypeId === DPL5)!
    expect(t).toMatchObject({ opening: 29, received: 470, used: 428, closing: 71 })
  })
})

describe('reconcileReceipts', () => {
  const rows = buildVehicleFuelRows(openings, waybills)
  it('ok, коли розподілено = надійшло', () => {
    const r = reconcileReceipts(rows, [{ fuelTypeId: DPL5, liters: 470 }, { fuelTypeId: A95, liters: 160 }])
    expect(r.every((x) => x.ok)).toBe(true)
  })
  it('розбіжність блокується', () => {
    const issues = validatePeriod(rows, [{ fuelTypeId: DPL5, liters: 465 }, { fuelTypeId: A95, liters: 160 }], waybills)
    expect(issues.map((i) => i.code)).toEqual(['receipt_mismatch'])
  })
  it('пальне, отримане авто, але без надходження від постачальника — розбіжність', () => {
    expect(reconcileReceipts(rows, []).some((x) => !x.ok)).toBe(true)
  })
})

describe('validatePeriod', () => {
  it("від'ємний залишок і спідометр назад", () => {
    const wb: Waybill[] = [{ vehicleId: 'x', fuelTypeId: A95, litersReceived: 0, litersUsed: 10, odometerStart: 100, odometerEnd: 90 }]
    const rows = buildVehicleFuelRows([], wb)
    const codes = validatePeriod(rows, [], wb).map((i) => i.code)
    expect(codes).toContain('negative_closing')
    expect(codes).toContain('odometer_regress')
  })
})

describe('nextOpenings', () => {
  it('закриті залишки стають початковими', () => {
    const rows = buildVehicleFuelRows(openings, waybills)
    expect(nextOpenings(rows).find((o) => o.vehicleId === BOG)!.opening).toBe(33)
  })
})
