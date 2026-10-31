import type { CategorieRef, FormatRef, Unite } from '../../api/types'
import { formatContenance } from '../../lib/format'

/** Bouton de saisie ; id null pour une copie locale du référentiel antérieure aux variantes */
export type BoutonSaisie = Omit<FormatRef, 'id'> & { id: number | null }

/**
 * Boutons proposés pour une catégorie. Une copie locale antérieure aux variantes n'a que des contenances.
 */
export function boutonsCategorie(categorie: CategorieRef): BoutonSaisie[] {
  return categorie.boutons ?? categorie.formats.map((contenance) => ({ id: null, contenance, libelle: null }))
}

/** Texte d'un bouton : « Olive / colza 1 L », « T4 », « 500 g » */
export function libelleBouton(bouton: Omit<BoutonSaisie, 'id'>, unite: Unite): string {
  const contenance = bouton.contenance === null || unite === 'unite' ? null : formatContenance(bouton.contenance, unite)
  return [bouton.libelle, contenance].filter(Boolean).join(' ')
}

/** Libellé de la variante d'une saisie (bouton choisi), d'après le référentiel du téléphone */
export function varianteSaisie(categorie: CategorieRef | undefined, formatId: number | null | undefined): string | null {
  return formatId == null ? null : (categorie?.boutons?.find((b) => b.id === formatId)?.libelle ?? null)
}

/**
 * Libellé court d'une saisie : « 2 × Pâtes 500 g », « 3 × Savon », « 1 × Huile (contenance inconnue) »,
 * avec la variante éventuelle : « 2 × Huile Olive / colza 1 L », « 3 × Couches T4 ».
 */
export function libelleSaisie(
  categorie: Pick<CategorieRef, 'nom' | 'unite'> | undefined,
  quantite: number,
  contenanceUnitaire: number | null,
  variante: string | null = null,
): string {
  const nom = [categorie?.nom ?? 'Catégorie inconnue', variante].filter(Boolean).join(' ')
  if (!categorie || categorie.unite === 'unite') {
    return `${quantite} × ${nom}`
  }
  return contenanceUnitaire === null
    ? `${quantite} × ${nom} (contenance inconnue)`
    : `${quantite} × ${nom} ${formatContenance(contenanceUnitaire, categorie.unite)}`
}
