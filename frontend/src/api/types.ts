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

// --- Synchronisation (bénévole) ------------------------------------------------------------------

/** Saisie telle qu'envoyée par le téléphone */
export interface SaisieEnvoyee {
  id: string
  campagneId: number
  magasinId: number
  categorieId: number
  quantite: number
  contenanceUnitaire: number | null
  saisieLe: string
  modifieLe: string
  supprime: boolean
  /** Version serveur connue du téléphone */
  baseMajLe: string | null
}

/** Saisie telle qu'enregistrée par le serveur */
export interface SaisieServeur {
  id: string
  campagneId: number
  magasinId: number
  categorieId: number
  quantite: number
  contenanceUnitaire: number | null
  saisieLe: string
  modifieLe: string
  supprime: boolean
  corrigeParResponsable: string | null
  /** Marqueur de version côté serveur */
  majLe: string
}

export interface ResultatSync {
  id: string | null
  statut: 'ok' | 'conflit' | 'rejete'
  erreur?: string
  saisie?: SaisieServeur
}

export interface SyncRequest {
  prenom: string
  curseur: string | null
  saisies: SaisieEnvoyee[]
}

export interface SyncResponse {
  resultats: ResultatSync[]
  changements: SaisieServeur[]
  curseur: string
}

// --- Saisies (administration) --------------------------------------------------------------------

export interface SaisieAdmin {
  id: string
  campagneId: number
  magasinId: number
  categorieId: number
  quantite: number
  contenanceUnitaire: number | null
  saisieLe: string
  modifieLe: string
  supprime: boolean
  corrigeParResponsable: string | null
  /** Prénom du bénévole (appareil) */
  prenom: string
  magasinNom: string
  categorieNom: string
  unite: Unite
  /** Code de référence actuel de la catégorie */
  codeReference: string | null
}

export interface PageSaisies {
  saisies: SaisieAdmin[]
  total: number
  page: number
  parPage: number
}

export interface FiltresSaisies {
  campagne?: number
  magasin?: number
  categorie?: number
  /** Identifiant complet de l'appareil (téléphone) du bénévole */
  appareil?: string
  prenom?: string
  /** Recherche « contient » dans le code de référence de la catégorie */
  code?: string
  /** Saisies dont la catégorie n'a pas de code de référence */
  sansCode?: boolean
  supprimees?: boolean
  page: number
}

export interface CorrectionSaisie {
  magasinId: number
  categorieId: number
  quantite: number
  contenanceUnitaire: number | null
}

// --- Appareils (administration) ------------------------------------------------------------------

export interface AppareilAdmin {
  id: string
  /** Dernier prénom saisi sur le téléphone */
  prenom: string
  /** Magasin de la dernière saisie de la campagne */
  magasinId: number | null
  nbSaisies: number
  nbArticles: number
  derniereSaisie: string | null
  creeLe: string
  /** Dernière synchronisation */
  vuLe: string
  /** Temps écoulé depuis la dernière synchronisation, selon l'horloge du serveur */
  vuIlYaSecondes: number
  connecte: boolean
}

export interface ListeAppareils {
  campagne: { id: number; nom: string }
  /** Délai (configurable sur le serveur) en deçà duquel un appareil est « connecté » */
  connecteMinutes: number
  appareils: AppareilAdmin[]
}

export interface SaisieExport {
  /** Heure locale du don, sans fuseau : « AAAA-MM-JJ HH:MM:SS » */
  saisieLe: string
  magasin: string
  ville: string
  prenom: string
  categorie: string
  codeReference: string | null
  unite: Unite
  quantite: number
  contenanceUnitaire: number | null
  corrigeParResponsable: string | null
}

export interface ExportSaisies {
  campagne: { id: number; nom: string }
  saisies: SaisieExport[]
}

export interface ChangementMagasin {
  ids: string[]
  magasinId: number
}

// --- Bilans --------------------------------------------------------------------------------------

/** Totaux : poids en grammes (catégories en kg), volumes en millilitres (catégories en L) */
export interface TotauxBilan {
  nbSaisies: number
  nbArticles: number
  grammes: number
  millilitres: number
  /** Articles en kg ou en L saisis sans contenance (non comptés dans les poids et volumes) */
  sansContenance: number
}

export interface BilanCategorie {
  categorieId: number
  nom: string
  unite: Unite
  nbSaisies: number
  nbArticles: number
  /** Total en g ou en ml ; null pour une catégorie à l'unité */
  contenance: number | null
  sansContenance: number
}

export interface BilanHeure {
  /** AAAA-MM-JJ */
  jour: string
  heure: number
  nbSaisies: number
  nbArticles: number
  grammes: number
  millilitres: number
}

export interface BilanMagasin extends TotauxBilan {
  magasinId: number
  nom: string
  ville: string
}

export interface CampagneBilan {
  id: number
  nom: string
  dateDebut: string
  dateFin: string
}

export interface BilanAdmin {
  campagne: CampagneBilan
  magasinId: number | null
  totaux: TotauxBilan
  categories: BilanCategorie[]
  heures: BilanHeure[]
  magasins: BilanMagasin[]
}

export type BilanPublic =
  | { campagne: null }
  | {
      campagne: CampagneBilan
      magasin: { magasinId: number; totaux: TotauxBilan; categories: BilanCategorie[] } | null
      general: TotauxBilan
      classement: BilanMagasin[]
    }
