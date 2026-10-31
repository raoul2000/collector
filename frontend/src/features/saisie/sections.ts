import type { CategorieRef, Referentiel, SectionRef } from '../../api/types'

export interface GroupeCategories {
  /** null : catégories sans section */
  section: SectionRef | null
  categories: CategorieRef[]
}

/**
 * Catégories regroupées par section, dans l'ordre d'affichage ; les catégories sans section forment le dernier
 * groupe. Sans aucune section, un seul groupe (grille simple, comme avant l'arrivée des sections).
 */
export function grouperParSection(referentiel: Pick<Referentiel, 'sections' | 'categories'>): GroupeCategories[] {
  const sections = referentiel.sections ?? []
  const groupes: GroupeCategories[] = sections.map((section) => ({ section, categories: [] }))
  const parId = new Map(groupes.map((g) => [g.section!.id, g]))
  const sansSection: GroupeCategories = { section: null, categories: [] }

  for (const categorie of referentiel.categories) {
    const groupe = (categorie.sectionId != null && parId.get(categorie.sectionId)) || sansSection
    groupe.categories.push(categorie)
  }

  return [...groupes, sansSection].filter((g) => g.categories.length > 0)
}
