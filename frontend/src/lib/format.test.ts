import { describe, expect, it } from 'vitest'
import { formatContenance, formatDate } from './format'

describe('formatContenance', () => {
  it.each([
    [250, 'kg', '250 g'],
    [1000, 'kg', '1 kg'],
    [1500, 'kg', '1,5 kg'],
    [2250, 'kg', '2,25 kg'],
    [500, 'L', '50 cl'],
    [330, 'L', '33 cl'],
    [125, 'L', '125 ml'],
    [1000, 'L', '1 L'],
    [1500, 'L', '1,5 L'],
    [3, 'unite', ''],
  ] as const)('%i %s → « %s »', (contenance, unite, attendu) => {
    expect(formatContenance(contenance, unite)).toBe(attendu)
  })
})

describe('formatDate', () => {
  it('affiche une date ISO au format français', () => {
    expect(formatDate('2026-11-27')).toBe('27/11/2026')
  })
})
