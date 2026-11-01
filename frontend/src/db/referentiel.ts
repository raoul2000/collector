import { useLiveQuery } from 'dexie-react-hooks'
import type { Referentiel } from '../api/types'
import { db, type ReferentielLocal } from './db'

/**
 * Copie locale du référentiel (campagne active, magasins, catégories), mise à jour à chaque synchronisation.
 * Elle permet de saisir sans réseau, même après un redémarrage du téléphone.
 */

const memesProduits = (a: number[] = [], b: number[] = []) => a.length === b.length && a.every((id) => b.includes(id))

/**
 * @returns true si la liste des produits à privilégier a changé (jamais au premier téléchargement)
 */
export async function enregistrerReferentiel(data: Referentiel, now = new Date()): Promise<boolean> {
  const actuel = await db.referentiel.get('courant')
  if (actuel?.data.version === data.version) {
    // Contenu identique : évite de réveiller inutilement les écrans abonnés
    return false
  }
  const change = actuel !== undefined && !memesProduits(actuel.data.privilegiees, data.privilegiees)
  await db.referentiel.put({
    cle: 'courant',
    data,
    misAJourLe: now.toISOString(),
    privilegieesNonVues: change || actuel?.privilegieesNonVues === true,
  })
  return change
}

export async function marquerPrivilegieesVues(): Promise<void> {
  await db.referentiel.update('courant', { privilegieesNonVues: false })
}

/**
 * Référentiel local : undefined pendant la lecture, null s'il n'a encore jamais été téléchargé.
 */
export function useReferentiel(): ReferentielLocal | null | undefined {
  return useLiveQuery(async () => (await db.referentiel.get('courant')) ?? null)
}
