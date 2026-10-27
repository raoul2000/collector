/**
 * Types des données échangées avec l'API (cf. docs/specifications.md, 5.5).
 * Les contenances sont en grammes (unité kg) ou en millilitres (unité L).
 */

export type Unite = 'kg' | 'L' | 'unite'

// --- Référentiel (public) ------------------------------------------------------------------------

export interface CampagneRef {
  id: number
  nom: string
  dateDebut: string
  dateFin: string
  active: boolean
}

export interface MagasinRef {
  id: number
  nom: string
  ville: string
}

export interface CategorieRef {
  id: number
  nom: string
  unite: Unite
  formats: number[]
}

export interface Referentiel {
  campagne: CampagneRef | null
  magasins: MagasinRef[]
  categories: CategorieRef[]
  version: string
}

// --- Administration ------------------------------------------------------------------------------

export interface AdminSession {
  prenom: string
}

export interface Campagne extends CampagneRef {
  magasinIds: number[]
  nbSaisies: number
}

export interface CampagneInput {
  nom: string
  dateDebut: string
  dateFin: string
  magasinIds?: number[]
}

export interface Magasin {
  id: number
  nom: string
  ville: string
  actif: boolean
  nbSaisies: number
}

export interface MagasinInput {
  nom: string
  ville: string
  actif: boolean
}

export interface Categorie {
  id: number
  nom: string
  unite: Unite
  ordre: number
  active: boolean
  codeReference: string | null
  formats: number[]
  nbSaisies: number
}

export interface CategorieInput {
  nom: string
  unite: Unite
  active: boolean
  codeReference: string
  formats: number[]
}
