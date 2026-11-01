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

export interface SectionRef {
  id: number
  nom: string
}

/**
 * Bouton proposé à la saisie : une contenance (g ou ml) et/ou un libellé de variante
 * (« Olive / colza » 1 L ; « T4 », sans contenance, pour une catégorie à l'unité).
 */
export interface FormatRef {
  id: number
  contenance: number | null
  libelle: string | null
}

export interface CategorieRef {
  id: number
  nom: string
  /** Absent d'une copie locale enregistrée avant l'arrivée des sections */
  sectionId?: number | null
  unite: Unite
  /** Mots-clés de recherche (absents d'une copie locale antérieure à la recherche) */
  motsCles?: string[]
  /** Contenances seules (versions de l'application antérieures aux variantes) */
  formats: number[]
  /** Boutons proposés à la saisie (absent d'une copie locale antérieure aux variantes) */
  boutons?: FormatRef[]
}

export interface Referentiel {
  campagne: CampagneRef | null
  magasins: MagasinRef[]
  /** Sections ayant au moins une catégorie, dans l'ordre d'affichage (absent d'une ancienne copie locale) */
  sections?: SectionRef[]
  /** Dans l'ordre d'affichage : par section, les catégories sans section en dernier */
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

export interface Section {
  id: number
  nom: string
  ordre: number
  nbCategories: number
}

/** Bouton vu par les responsables, avec l'article AÏDA visé */
export interface FormatAdmin extends FormatRef {
  codeAida?: string | null
}

export interface Categorie {
  id: number
  nom: string
  sectionId: number | null
  unite: Unite
  ordre: number
  active: boolean
  codeReference: string | null
  motsCles: string[]
  formats: FormatAdmin[]
  nbSaisies: number
}

/** Format envoyé à l'enregistrement d'une catégorie : sans identifiant, c'est un nouveau bouton */
export interface FormatInput {
  id?: number
  contenance: number | null
  libelle: string | null
  codeAida?: string | null
}

export interface CategorieInput {
  nom: string
  sectionId: number | null
  unite: Unite
  active: boolean
  codeReference: string
  /** Mots-clés séparés par des virgules */
  motsCles: string
  formats: FormatInput[]
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
  /** Bouton choisi (null : contenance libre ou inconnue) */
  formatId: number | null
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
  /** Absent d'une réponse d'un serveur antérieur aux variantes */
  formatId?: number | null
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

/** Recherche sans résultat d'un bénévole, et catégorie choisie ensuite */
export interface RechercheEnvoyee {
  /** UUID généré sur le téléphone */
  id: string
  campagneId: number
  terme: string
  categorieId: number | null
  /** ISO 8601 avec fuseau */
  chercheLe: string
}

export interface SyncRequest {
  prenom: string
  curseur: string | null
  saisies: SaisieEnvoyee[]
  recherches: RechercheEnvoyee[]
}

export interface SyncResponse {
  resultats: ResultatSync[]
  changements: SaisieServeur[]
  curseur: string
  /** Recherches enregistrées (absent d'un serveur antérieur : elles seront renvoyées) */
  recherchesRecues?: string[]
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
  /** Code AÏDA retenu selon le bouton ou la contenance (null : non rapprochée) */
  codeAida: string | null
  /** Le code a été déduit de la contenance */
  codeAVerifier: boolean
  formatId: number | null
  /** Libellé de la variante choisie */
  formatLibelle: string | null
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

export interface RechercheGroupee {
  /** Forme la plus tapée */
  terme: string
  nombre: number
  derniere: string
  /** Catégorie le plus souvent choisie ensuite */
  categorie: { id: number; nom: string } | null
}

export interface ListeRecherches {
  campagne: { id: number; nom: string }
  recherches: RechercheGroupee[]
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
  codeAida: string | null
  codeAVerifier: boolean
  /** Libellé de la variante choisie */
  variante: string | null
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

/** Nombre d'articles à saisir dans AÏDA pour un code */
export interface ArticleAida {
  code: string
  libelles: string[]
  nbArticles: number
  aVerifier: number
}

export interface ReceptionAida {
  campagne: CampagneBilan
  magasinId: number | null
  articles: ArticleAida[]
  nonRapprochees: { categorieId: number; nom: string; nbArticles: number; nbSaisies: number }[]
  totaux: { nbArticles: number; aVerifier: number; nonRapproches: number }
}

export type BilanPublic =
  | { campagne: null }
  | {
      campagne: CampagneBilan
      magasin: { magasinId: number; totaux: TotauxBilan; categories: BilanCategorie[] } | null
      general: TotauxBilan
      classement: BilanMagasin[]
    }
