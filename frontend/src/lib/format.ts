import type { Unite } from '../api/types'

const nombre = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 3 })

/**
 * Affiche une contenance stockée en grammes (unité kg) ou en millilitres (unité L).
 *
 *   formatContenance(500, 'kg')  → « 500 g »
 *   formatContenance(1500, 'kg') → « 1,5 kg »
 *   formatContenance(500, 'L')   → « 50 cl »
 *   formatContenance(1000, 'L')  → « 1 L »
 */
export function formatContenance(contenance: number, unite: Unite): string {
  switch (unite) {
    case 'kg':
      return contenance < 1000 ? `${nombre.format(contenance)} g` : `${nombre.format(contenance / 1000)} kg`
    case 'L':
      if (contenance >= 1000) {
        return `${nombre.format(contenance / 1000)} L`
      }
      return contenance % 10 === 0 ? `${nombre.format(contenance / 10)} cl` : `${nombre.format(contenance)} ml`
    case 'unite':
      return ''
  }
}

export const UNITE_LIBELLES: Record<Unite, string> = {
  kg: 'Poids (kg)',
  L: 'Volume (L)',
  unite: 'Quantité seule',
}

/**
 * Date AAAA-MM-JJ affichée en français (ex. « 27/11/2026 »).
 */
export function formatDate(isoDate: string): string {
  const [annee, mois, jour] = isoDate.split('-')
  return `${jour}/${mois}/${annee}`
}

const entier = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 })
const unDecimal = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 })

/** Nombre entier avec séparateur de milliers (« 1 234 ») */
export function formatNombre(n: number): string {
  return entier.format(n)
}

/** Total en grammes affiché en kilogrammes (« 1 234,5 kg ») */
export function formatKg(grammes: number): string {
  return `${unDecimal.format(grammes / 1000)} kg`
}

/** Total en millilitres affiché en litres (« 12,5 L ») */
export function formatLitres(millilitres: number): string {
  return `${unDecimal.format(millilitres / 1000)} L`
}

/** Accord simple : pluriel(3, 'article') → « 3 articles » */
export function pluriel(n: number, mot: string): string {
  return `${formatNombre(n)} ${mot}${Math.abs(n) > 1 ? 's' : ''}`
}
