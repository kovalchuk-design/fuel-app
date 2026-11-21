import { describe, expect, it } from 'vitest'
import { fuelCategory, summarizeByFuel, type FuelRef } from './summary.ts'

const fuels: FuelRef[] = [
  { id: 'a80', name: 'А-80', kind: 'fuel', sort: 1 }, { id: 'a80dz', name: 'А-80 ДЗ', kind: 'fuel', sort: 2 },
  { id: 'a95', name: 'А-95 Євро 5 Е0', kind: 'fuel', sort: 4 }, { id: 'dz', name: 'ДП-З Євро 5 В5', kind: 'fuel', sort: 5 },
  { id: 'v5', name: 'ДП-Л Євро 5 В5', kind: 'fuel', sort: 6 }, { id: 'v0', name: 'ДП-Л Євро 5 В0', kind: 'fuel', sort: 7 },
  { id: 'oil', name: 'Масло М10Г2К', kind: 'lubricant', sort: 14 },
]

describe('зведення залишків по видах пального', () => {
  const s = summarizeByFuel(fuels, [
    { fuelTypeId: 'a95', opening: 47 }, { fuelTypeId: 'a80dz', opening: 151 }, { fuelTypeId: 'a80', opening: 16 },
    { fuelTypeId: 'v5', opening: 15 }, { fuelTypeId: 'v5', opening: 14 }, { fuelTypeId: 'v0', opening: 1000 }, { fuelTypeId: 'dz', opening: 1743 },
  ])
  it('категорії: бензин і дизельне пальне, мастила без залишку не показуються', () => {
    expect(s.groups.map((g) => g.title)).toEqual(['Бензин', 'Дизельне пальне'])
  })
  it('суми по виду пального складаються по всіх машинах (ДП-Л В5: 15 + 14 = 29)', () => {
    const v5 = s.groups[1].rows.find((r) => r.fuelTypeId === 'v5')!
    expect(v5.liters).toBe(29)
  })
  it('проміжні підсумки груп і загальний підсумок', () => {
    expect(s.groups[0].total).toBe(214) // 16 + 151 + 47
    expect(s.groups[1].total).toBe(2772) // 1743 + 29 + 1000
    expect(s.total).toBe(2986)
  })
  it('вид без залишку теж у зведенні, з нулем (для статистики)', () => {
    expect(s.groups[1].rows.map((r) => r.liters)).toEqual([1743, 29, 1000])
    expect(summarizeByFuel(fuels, []).groups[0].rows.every((r) => r.liters === 0)).toBe(true)
  })
  it('мастило з залишком з’являється окремою групою й не входить у загальний підсумок пального', () => {
    const t = summarizeByFuel(fuels, [{ fuelTypeId: 'oil', opening: 5 }, { fuelTypeId: 'a80', opening: 10 }])
    expect(t.groups.map((g) => g.title)).toEqual(['Бензин', 'Дизельне пальне', 'Мастила'])
    expect(t.total).toBe(10)
  })
  it('категорія за назвою', () => {
    expect(fuelCategory({ name: 'А-92 Євро 5 Е0', kind: 'fuel' })).toBe('Бензин')
    expect(fuelCategory({ name: 'ДП-Артика Євро 5 В0', kind: 'fuel' })).toBe('Дизельне пальне')
  })
})
