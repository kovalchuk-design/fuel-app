import { describe, expect, it } from 'vitest'
import { defaultRange, isMonthDisabled, monthName, skippedMonths } from './months.ts'

const sep = { year: 2026, month: 9 }

describe('вибір місяця звіту', () => {
  it('після вересня: січень–вересень недоступні, жовтень–грудень доступні', () => {
    for (let m = 1; m <= 9; m++) expect(isMonthDisabled(2026, m, sep)).toBe(true)
    for (let m = 10; m <= 12; m++) expect(isMonthDisabled(2026, m, sep)).toBe(false)
  })
  it('наступний рік доступний', () => expect(isMonthDisabled(2027, 1, sep)).toBe(false))
  it('попередній рік недоступний', () => expect(isMonthDisabled(2025, 12, sep)).toBe(true))
  it('без звітів доступні всі місяці', () => expect(isMonthDisabled(2026, 1, null)).toBe(false))
  it('пропущені місяці', () => {
    expect(skippedMonths(2026, 10, sep)).toBe(0)
    expect(skippedMonths(2026, 12, sep)).toBe(2)
    expect(skippedMonths(2027, 1, sep)).toBe(3)
  })
  it('період: з 25-го до 25-го, грудень переходить на наступний рік', () => {
    expect(defaultRange(2026, 9)).toEqual({ from: '2026-09-25', to: '2026-10-25' })
    expect(defaultRange(2026, 12)).toEqual({ from: '2026-12-25', to: '2027-01-25' })
  })
  it('назви місяців', () => expect(monthName(9)).toBe('вересень'))
})
