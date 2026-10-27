import { describe, expect, it } from 'vitest'
import { formatHeure, formatJour, isoLocal } from './dates'

describe('isoLocal', () => {
  it('formate une date avec le décalage horaire du téléphone (heure d’hiver)', () => {
    const date = new Date('2026-11-27T09:15:07.045Z')

    expect(isoLocal(date)).toBe('2026-11-27T10:15:07+01:00')
    expect(isoLocal(date, true)).toBe('2026-11-27T10:15:07.045+01:00')
  })

  it('utilise le décalage de l’heure d’été', () => {
    expect(isoLocal(new Date('2026-07-01T12:00:00Z'))).toBe('2026-07-01T14:00:00+02:00')
  })

  it('désigne le même instant', () => {
    const date = new Date('2026-11-27T23:59:59.999Z')
    expect(new Date(isoLocal(date, true)).getTime()).toBe(date.getTime())
  })
})

describe('formatHeure / formatJour', () => {
  it('affiche l’heure et le jour en français', () => {
    expect(formatHeure('2026-11-27T10:05:00+01:00')).toBe('10:05')
    expect(formatJour('2026-11-27T10:05:00+01:00')).toBe('vendredi 27 novembre')
  })
})
