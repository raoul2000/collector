import type { Column } from 'write-excel-file/universal'
import { api } from '../../../api/client'
import type { ExportSaisies, ReceptionAida, SaisieExport, Unite } from '../../../api/types'

const entete = (value: string) => ({ value, fontWeight: 'bold' as const })

/**
 * « AAAA-MM-JJ HH:MM:SS » (heure locale) → Date dont l'heure UTC est cette heure locale :
 * les dates Excel n'ont pas de fuseau et la bibliothèque les écrit en UTC.
 */
export function dateExcel(locale: string): Date {
  const [an, mois, jour, heure, minute, seconde] = locale.split(/[- :]/).map(Number)
  return new Date(Date.UTC(an!, mois! - 1, jour!, heure!, minute!, seconde!))
}

const LIBELLES_UNITE: Record<Unite, string> = { kg: 'kg', L: 'L', unite: 'unité' }

/**
 * Poids (kg) ou volume (L) total de la saisie dans l'unité demandée ; cellule vide si sans objet ou contenance
 * inconnue (la bibliothèque refuse un format sur une cellule vide).
 */
const total = (s: SaisieExport, unite: Unite) =>
  s.unite === unite && s.contenanceUnitaire !== null ? { value: (s.quantite * s.contenanceUnitaire) / 1000, format: '0.000' } : {}

export const COLONNES: Column<SaisieExport>[] = [
  { header: entete('Date'), cell: (s) => ({ value: dateExcel(s.saisieLe), format: 'dd/mm/yyyy' }), width: 12 },
  { header: entete('Heure'), cell: (s) => ({ value: dateExcel(s.saisieLe), format: 'hh:mm' }), width: 8 },
  { header: entete('Magasin'), cell: (s) => ({ value: s.magasin }), width: 22 },
  { header: entete('Ville'), cell: (s) => ({ value: s.ville || undefined }), width: 18 },
  { header: entete('Bénévole'), cell: (s) => ({ value: s.prenom }), width: 14 },
  { header: entete('Catégorie'), cell: (s) => ({ value: s.categorie }), width: 28 },
  { header: entete('Variante'), cell: (s) => ({ value: s.variante ?? undefined }), width: 16 },
  { header: entete('Code AÏDA'), cell: (s) => ({ value: s.codeAida ?? undefined }), width: 16 },
  { header: entete('Code à vérifier'), cell: (s) => ({ value: s.codeAVerifier ? 'Oui' : undefined }), width: 10 },
  { header: entete('Unité'), cell: (s) => ({ value: LIBELLES_UNITE[s.unite] }), width: 8 },
  { header: entete('Articles'), cell: (s) => ({ value: s.quantite }), width: 9 },
  { header: entete('Contenance (g ou ml)'), cell: (s) => ({ value: s.contenanceUnitaire ?? undefined }), width: 12 },
  { header: entete('Poids total (kg)'), cell: (s) => total(s, 'kg'), width: 12 },
  { header: entete('Volume total (L)'), cell: (s) => total(s, 'L'), width: 12 },
  { header: entete('Corrigée par'), cell: (s) => ({ value: s.corrigeParResponsable ?? undefined }), width: 14 },
]

/** « Collecte novembre 2026 » → « collecte-novembre-2026 » */
export function nomFichier(nomCampagne: string): string {
  const nom = nomCampagne
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return nom || 'collecte'
}

function telecharger(blob: Blob, fichier: string): void {
  const url = URL.createObjectURL(blob)
  const lien = document.createElement('a')
  lien.href = url
  lien.download = fichier
  document.body.append(lien)
  lien.click()
  lien.remove()
  // Laisse au navigateur le temps de démarrer le téléchargement
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * Exporte les saisies d'une campagne dans un fichier Excel téléchargé par le navigateur.
 * La bibliothèque n'est chargée qu'à ce moment : l'application des bénévoles ne s'en trouve pas alourdie.
 *
 * @returns le nombre de saisies exportées
 */
export async function exporterCampagne(campagneId: number): Promise<number> {
  const [donnees, { default: writeExcelFile }] = await Promise.all([
    api.get<ExportSaisies>(`admin/saisies/export?campagne=${campagneId}`),
    import('write-excel-file/universal'),
  ])
  const blob = await writeExcelFile(donnees.saisies, { columns: COLONNES, sheet: 'Saisies', stickyRowsCount: 1 }).toBlob()
  telecharger(blob, `${nomFichier(donnees.campagne.nom)}.xlsx`)
  return donnees.saisies.length
}

interface LigneAida {
  code?: string
  produit: string
  articles: number
  aVerifier?: number
}

const COLONNES_AIDA: Column<LigneAida>[] = [
  { header: entete('Code AÏDA'), cell: (l) => ({ value: l.code }), width: 16 },
  { header: entete('Produit'), cell: (l) => ({ value: l.produit }), width: 44 },
  { header: entete('Articles'), cell: (l) => ({ value: l.articles }), width: 10 },
  { header: entete('Dont à vérifier'), cell: (l) => ({ value: l.aVerifier }), width: 14 },
]

/** Lignes du fichier : les articles à saisir, puis les catégories sans code */
export function lignesAida(reception: ReceptionAida): LigneAida[] {
  return [
    ...reception.articles.map((a) => ({
      code: a.code,
      produit: a.libelles.join(', '),
      articles: a.nbArticles,
      aVerifier: a.aVerifier > 0 ? a.aVerifier : undefined,
    })),
    ...reception.nonRapprochees.map((c) => ({ produit: `Non rapproché : ${c.nom}`, articles: c.nbArticles })),
  ]
}

/** Exporte la réception AÏDA affichée dans un fichier Excel téléchargé par le navigateur. */
export async function exporterReceptionAida(reception: ReceptionAida, nomMagasin: string | undefined): Promise<void> {
  const { default: writeExcelFile } = await import('write-excel-file/universal')
  const blob = await writeExcelFile(lignesAida(reception), { columns: COLONNES_AIDA, sheet: 'Réception AÏDA', stickyRowsCount: 1 }).toBlob()
  telecharger(blob, `${nomFichier(['reception-aida', reception.campagne.nom, nomMagasin].filter(Boolean).join(' '))}.xlsx`)
}
