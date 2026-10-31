import { isoLocal } from '../lib/dates'
import { db } from './db'

/** En dessous, il s'agit plutôt d'une recherche abandonnée en cours de frappe */
export const LONGUEUR_MIN = 3

/**
 * Mémorise une recherche sans résultat et la catégorie choisie ensuite (null : aucune), pour que les responsables
 * complètent les mots-clés. Elle partira avec la prochaine synchronisation.
 */
export async function enregistrerRecherche(
  campagneId: number,
  terme: string,
  categorieId: number | null,
  now = new Date(),
): Promise<void> {
  const mot = terme.trim().replace(/\s+/g, ' ').slice(0, 100)
  if (mot.length < LONGUEUR_MIN) {
    return
  }
  await db.recherches.add({ id: crypto.randomUUID(), campagneId, terme: mot, categorieId, chercheLe: isoLocal(now) })
}
