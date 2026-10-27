import { useLiveQuery } from 'dexie-react-hooks'
import type { Referentiel } from '../api/types'
import { db, type ReferentielLocal } from './db'

/**
 * Copie locale du référentiel (campagne active, magasins, catégories), mise à jour à chaque synchronisation.
 * Elle permet de saisir sans réseau, même après un redémarrage du téléphone.
 */

export async function enregistrerReferentiel(data: Referentiel, now = new Date()): Promise<void> {
  const actuel = await db.referentiel.get('courant')
  if (actuel?.data.version === data.version) {
    // Contenu identique : évite de réveiller inutilement les écrans abonnés
    return
  }
  await db.referentiel.put({ cle: 'courant', data, misAJourLe: now.toISOString() })
}

/**
 * Référentiel local : undefined pendant la lecture, null s'il n'a encore jamais été téléchargé.
 */
export function useReferentiel(): ReferentielLocal | null | undefined {
  return useLiveQuery(async () => (await db.referentiel.get('courant')) ?? null)
}
