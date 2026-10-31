import { useLiveQuery } from 'dexie-react-hooks'
import { isoLocal } from '../lib/dates'
import { db, type SaisieLocale } from './db'

/** Contenu d'une saisie modifiable par le bénévole */
export interface ContenuSaisie {
  categorieId: number
  quantite: number
  contenanceUnitaire: number | null
  /** Bouton choisi ; absent : aucun */
  formatId?: number | null
}

export interface NouvelleSaisie extends ContenuSaisie {
  campagneId: number
  magasinId: number
}

/**
 * Enregistre une nouvelle saisie sur le téléphone ; elle sera envoyée à la prochaine synchronisation.
 */
export async function creerSaisie(saisie: NouvelleSaisie, now = new Date()): Promise<SaisieLocale> {
  const locale: SaisieLocale = {
    formatId: null,
    ...saisie,
    id: crypto.randomUUID(),
    saisieLe: isoLocal(now),
    modifieLe: isoLocal(now, true),
    supprime: false,
    aEnvoyer: 1,
    baseMajLe: null,
    corrigeParResponsable: null,
    erreur: null,
  }
  await db.saisies.add(locale)
  return locale
}

export async function modifierSaisie(id: string, contenu: ContenuSaisie, now = new Date()): Promise<void> {
  await db.saisies.update(id, { formatId: null, ...contenu, modifieLe: isoLocal(now, true), aEnvoyer: 1, erreur: null })
}

/**
 * Suppression logique : la saisie reste en base, marquée supprimée, pour que la suppression soit transmise
 * au serveur (même si la saisie n'y était pas encore parvenue : un envoi pouvait être en cours).
 */
export async function supprimerSaisie(id: string, now = new Date()): Promise<void> {
  await db.saisies.update(id, { supprime: true, modifieLe: isoLocal(now, true), aEnvoyer: 1, erreur: null })
}

/** Saisies non supprimées du téléphone, de la plus récente à la plus ancienne */
export function useMesSaisies(): SaisieLocale[] | undefined {
  return useLiveQuery(() => db.saisies.orderBy('saisieLe').reverse().filter((s) => !s.supprime).toArray())
}

/** Nombre de saisies en attente d'envoi au serveur */
export function useNbAEnvoyer(): number | undefined {
  return useLiveQuery(() => db.saisies.where('aEnvoyer').equals(1).count())
}
