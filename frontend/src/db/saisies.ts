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
  /** Description du produit, pour une catégorie qui l'exige ; absente : inchangée */
  precisionProduit?: string
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

/**
 * Catégories les plus souvent saisies, de la plus fréquente à la moins fréquente, d'après des saisies en ordre
 * chronologique. Chaque saisie compte pour un, quelle que soit sa quantité. Une catégorie ne monte que si elle dépasse
 * la précédente : à égalité, elle garde sa place et les boutons bougent le moins possible.
 */
export function classerFrequentes(categoriesSaisies: number[], nombre: number): number[] {
  const comptes = new Map<number, number>()
  const ordre: number[] = []
  for (const id of categoriesSaisies) {
    const compte = (comptes.get(id) ?? 0) + 1
    comptes.set(id, compte)
    let position = ordre.indexOf(id)
    if (position < 0) {
      position = ordre.push(id) - 1
    }
    while (position > 0 && comptes.get(ordre[position - 1]!)! < compte) {
      ordre[position] = ordre[position - 1]!
      ordre[position - 1] = id
      position--
    }
  }
  return ordre.slice(0, nombre)
}

/**
 * Catégories les plus fréquentes du téléphone pour une campagne, parmi celles proposées (saisies supprimées exclues).
 */
export function useCategoriesFrequentes(campagneId: number | undefined, proposees: number[], nombre: number): number[] | undefined {
  return useLiveQuery(
    async () => {
      const autorisees = new Set(proposees)
      const saisies = await db.saisies
        .filter((s) => !s.supprime && s.campagneId === campagneId && autorisees.has(s.categorieId))
        .toArray()
      // saisieLe est à la seconde : les millisecondes départagent deux saisies rapprochées, sinon ordonnées au hasard
      saisies.sort((a, b) => a.saisieLe.localeCompare(b.saisieLe) || a.modifieLe.localeCompare(b.modifieLe))
      return classerFrequentes(saisies.map((s) => s.categorieId), nombre)
    },
    [campagneId, proposees.join(','), nombre],
  )
}

/** Nombre de saisies en attente d'envoi au serveur */
export function useNbAEnvoyer(): number | undefined {
  return useLiveQuery(() => db.saisies.where('aEnvoyer').equals(1).count())
}
