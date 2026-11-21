import { describe, expect, it } from 'vitest'
import { vehicleOdometers } from './odometer.ts'

describe('vehicleOdometers', () => {
  it('початок із періоду, кінець — максимум по листах', () => {
    const o = vehicleOdometers(new Map([['bog', 58602]]), [
      { vehicleId: 'bog', odometerStart: 58602, odometerEnd: 59100 },
      { vehicleId: 'bog', odometerStart: 59100, odometerEnd: 59900 },
    ])('bog')
    expect(o).toEqual({ start: 58602, end: 59900, km: 1298 })
  })
  it('без листів: машина стояла, кінець = початок, 0 км', () => {
    expect(vehicleOdometers(new Map([['gaz', 242969]]), [])('gaz')).toEqual({ start: 242969, end: 242969, km: 0 })
  })
  it('початок не задано: береться мінімум із листів', () => {
    expect(vehicleOdometers(new Map(), [{ vehicleId: 'x', odometerStart: 100, odometerEnd: 150 }])('x')).toEqual({ start: 100, end: 150, km: 50 })
  })
  it('генератор без спідометра', () => {
    expect(vehicleOdometers(new Map(), [])('gen')).toEqual({ start: null, end: null, km: null })
  })
})
