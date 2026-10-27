import type { CategorieRef } from '../../api/types'
import { formatContenance } from '../../lib/format'

/**
 * Libellé court d'une saisie : « 2 × Pâtes 500 g », « 3 × Savon », « 1 × Huile (contenance inconnue) ».
 */
export function libelleSaisie(
  categorie: CategorieRef | undefined,
  quantite: number,
  contenanceUnitaire: number | null,
): string {
  const nom = categorie?.nom ?? 'Catégorie inconnue'
  if (!categorie || categorie.unite === 'unite') {
    return `${quantite} × ${nom}`
  }
  return contenanceUnitaire === null
    ? `${quantite} × ${nom} (contenance inconnue)`
    : `${quantite} × ${nom} ${formatContenance(contenanceUnitaire, categorie.unite)}`
}
