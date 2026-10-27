import Dexie, { type EntityTable } from 'dexie'
import type { Referentiel } from '../api/types'

/**
 * Saisie conservée sur le téléphone. C'est la source de vérité de l'interface bénévole :
 * les écrans lisent toujours cette base, jamais directement le serveur.
 */
export interface SaisieLocale {
  /** UUID généré sur le téléphone */
  id: string
  campagneId: number
  magasinId: number
  categorieId: number
  quantite: number
  /** g ou ml ; null pour une catégorie à l'unité ou une contenance inconnue */
  contenanceUnitaire: number | null
  /** Heure du don (ISO 8601 avec fuseau) */
  saisieLe: string
  /** Dernière modification (ISO 8601 avec millisecondes et fuseau) */
  modifieLe: string
  /** Suppression logique, transmise au serveur */
  supprime: boolean
  /** 1 tant que la version locale n'a pas été acceptée par le serveur (index : pas de booléen dans IndexedDB) */
  aEnvoyer: 0 | 1
  /** Version serveur sur laquelle repose la version locale (null : jamais synchronisée) */
  baseMajLe: string | null
  /** Prénom du responsable ayant corrigé la saisie */
  corrigeParResponsable: string | null
  /** Motif de refus par le serveur */
  erreur: string | null
}

export interface ReferentielLocal {
  cle: 'courant'
  data: Referentiel
  /** Date de la dernière mise à jour depuis le serveur (ISO) */
  misAJourLe: string
}

export interface Meta {
  cle: string
  valeur: string
}

export class CollectorDb extends Dexie {
  saisies!: EntityTable<SaisieLocale, 'id'>
  referentiel!: EntityTable<ReferentielLocal, 'cle'>
  meta!: EntityTable<Meta, 'cle'>

  constructor(name = 'collector') {
    super(name)
    // Seuls les champs listés sont indexés (clé primaire en premier)
    this.version(1).stores({
      saisies: 'id, aEnvoyer, saisieLe',
      referentiel: 'cle',
      meta: 'cle',
    })
  }
}

export const db = new CollectorDb()

/** Clés de la table meta */
export const META = {
  /** Curseur de synchronisation renvoyé par le serveur */
  curseur: 'curseur',
  /** Date de la dernière synchronisation réussie (ISO) */
  derniereSynchro: 'derniereSynchro',
} as const
