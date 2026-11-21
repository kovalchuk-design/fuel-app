import { describe, expect, it } from 'vitest'
import { defaultRange, isMonthDisabled, monthName, skippedMonths } from './months.ts'

const oct = { year: 2026, month: 10 }

describe('вибір місяця звіту', () => {
  it('після жовтня: січень–жовтень недоступні, листопад і грудень доступні', () => {
    for (let m = 1; m <= 10; m++) expect(isMonthDisabled(2026, m, oct)).toBe(true)
    for (let m = 11; m <= 12; m++) expect(isMonthDisabled(2026, m, oct)).toBe(false)
  })
  it('наступний рік доступний', () => expect(isMonthDisabled(2027, 1, oct)).toBe(false))
  it('попередній рік недоступний', () => expect(isMonthDisabled(2025, 12, oct)).toBe(true))
  it('без звітів доступні всі місяці', () => expect(isMonthDisabled(2026, 1, null)).toBe(false))
  it('пропущені місяці', () => {
    expect(skippedMonths(2026, 11, oct)).toBe(0)
    expect(skippedMonths(2026, 12, oct)).toBe(1)
    expect(skippedMonths(2027, 1, oct)).toBe(2)
  })
  it('період звіту за місяць закінчується 25-го цього місяця: жовтень = 25.09–25.10', () => {
    expect(defaultRange(2026, 10)).toEqual({ from: '2026-09-25', to: '2026-10-25' })
    expect(defaultRange(2026, 11)).toEqual({ from: '2026-10-25', to: '2026-11-25' })
  })
  it('січень починається з 25 грудня попереднього року', () => {
    expect(defaultRange(2027, 1)).toEqual({ from: '2026-12-25', to: '2027-01-25' })
  })
  it('назви місяців', () => expect(monthName(10)).toBe('жовтень'))
})
