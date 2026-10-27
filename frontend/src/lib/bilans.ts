import type { BilanCategorie, BilanHeure } from '../api/types'
import { formatKg, formatLitres, pluriel } from './format'

export interface Colonne {
  heure: number
  nbArticles: number
  grammes: number
  millilitres: number
}

/**
 * Regroupe les totaux horaires par jour, en complétant les heures sans saisie pour que tous les jours
 * partagent le même axe horaire.
 */
export function colonnesParJour(heures: BilanHeure[]): Array<{ jour: string; colonnes: Colonne[] }> {
  if (heures.length === 0) {
    return []
  }
  const premiere = Math.min(...heures.map((h) => h.heure))
  const derniere = Math.max(...heures.map((h) => h.heure))
  const jours = [...new Set(heures.map((h) => h.jour))]

  return jours.map((jour) => ({
    jour,
    colonnes: Array.from({ length: derniere - premiere + 1 }, (_, i) => {
      const heure = premiere + i
      const h = heures.find((x) => x.jour === jour && x.heure === heure)
      return { heure, nbArticles: h?.nbArticles ?? 0, grammes: h?.grammes ?? 0, millilitres: h?.millilitres ?? 0 }
    }),
  }))
}

/**
 * Poids ou volume total d'une catégorie (« 4 kg », « 2,5 L »), ou null pour une catégorie à l'unité.
 */
export function totalContenance(categorie: BilanCategorie): string | null {
  if (categorie.contenance === null || categorie.unite === 'unite') {
    return null
  }
  return categorie.unite === 'kg' ? formatKg(categorie.contenance) : formatLitres(categorie.contenance)
}

/**
 * Mention des articles sans contenance (« dont 3 articles sans poids »), ou null.
 */
export function mentionSansContenance(categorie: BilanCategorie): string | null {
  if (categorie.sansContenance === 0) {
    return null
  }
  return `dont ${pluriel(categorie.sansContenance, 'article')} sans ${categorie.unite === 'kg' ? 'poids' : 'volume'}`
}

/**
 * Graduations « rondes » (pas de 1, 2, 5 × 10ⁿ) couvrant 0 → maximum, environ quatre intervalles.
 *
 *   graduations(138) → [0, 50, 100, 150]
 */
export function graduations(maximum: number, intervalles = 4): number[] {
  if (maximum <= 0) {
    return [0, 1]
  }
  const brut = maximum / intervalles
  const puissance = 10 ** Math.floor(Math.log10(brut))
  const pas = ([1, 2, 5, 10].find((m) => m * puissance >= brut) ?? 10) * puissance
  const pasEntier = Math.max(1, pas)
  return Array.from({ length: Math.ceil(maximum / pasEntier) + 1 }, (_, i) => i * pasEntier)
}

/** Première lettre en majuscule (« vendredi 27 novembre » → « Vendredi 27 novembre ») */
export function majuscule(texte: string): string {
  return texte.charAt(0).toUpperCase() + texte.slice(1)
}
