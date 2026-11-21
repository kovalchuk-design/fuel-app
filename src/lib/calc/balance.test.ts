import { describe, expect, it } from 'vitest'
import { closingBalance } from './balance.ts'

describe('closingBalance', () => {
  it('рахує залишок (Volkswagen А-95: 47 + 160 − 128 = 79)', () => {
    expect(closingBalance(47, 160, 128)).toBe(79)
  })
  it('не накопичує похибку float', () => {
    expect(closingBalance(113.5, 0.1, 0.2)).toBe(113.4)
  })
})
