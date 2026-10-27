import type { Unite } from '../api/types'

/** Unités proposées à la saisie d'une contenance, avec leur facteur de conversion vers g ou ml */
export const UNITES_SAISIE = {
  kg: [
    { symbole: 'g', facteur: 1 },
    { symbole: 'kg', facteur: 1000 },
  ],
  L: [
    { symbole: 'cl', facteur: 10 },
    { symbole: 'L', facteur: 1000 },
    { symbole: 'ml', facteur: 1 },
  ],
} as const satisfies Record<Exclude<Unite, 'unite'>, ReadonlyArray<{ symbole: string; facteur: number }>>

/** Contenance maximale : 25 kg ou 10 L (cf. spécifications 4.2) */
export const CONTENANCE_MAX: Record<Exclude<Unite, 'unite'>, number> = { kg: 25_000, L: 10_000 }

/**
 * Convertit une valeur saisie (« 1,5 » avec le facteur 1000) en contenance entière (g ou ml).
 * Renvoie null si la valeur n'est pas un nombre strictement positif.
 */
export function parseContenance(texte: string, facteur: number): number | null {
  const normalise = texte.trim().replace(/\s/g, '').replace(',', '.')
  if (!/^\d+(\.\d+)?$/.test(normalise)) {
    return null
  }
  const contenance = Math.round(Number(normalise) * facteur)
  return contenance > 0 ? contenance : null
}
