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

describe('totaux', () => {
  it('formate les nombres, poids et volumes', async () => {
    const { formatNombre, formatKg, formatLitres, pluriel } = await import('./format')
    // Intl sépare les milliers par une espace fine insécable (U+202F)
    expect(formatNombre(1234)).toBe('1 234')
    expect(formatKg(1234500)).toBe('1 234,5 kg')
    expect(formatKg(250)).toBe('0,3 kg')
    expect(formatLitres(12500)).toBe('12,5 L')
    expect(pluriel(1, 'article')).toBe('1 article')
    expect(pluriel(0, 'article')).toBe('0 article')
    expect(pluriel(1500, 'article')).toBe('1 500 articles')
  })
})
