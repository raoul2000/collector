import type { Campagne, Magasin } from '../../../api/types'

export const nomMagasin = (magasin: Pick<Magasin, 'nom' | 'ville'>) => [magasin.nom, magasin.ville].filter(Boolean).join(' – ')

/**
 * Magasins vers lesquels un responsable peut déplacer des saisies : actifs et participant à chacune
 * des campagnes de ces saisies (même règle que l'API).
 */
export function magasinsDisponibles(magasins: Magasin[], campagnes: Campagne[], campagneIds: number[]): Magasin[] {
  const participants = campagneIds.map((id) => new Set(campagnes.find((c) => c.id === id)?.magasinIds ?? []))
  return magasins.filter((m) => m.actif && participants.every((ids) => ids.has(m.id)))
}
