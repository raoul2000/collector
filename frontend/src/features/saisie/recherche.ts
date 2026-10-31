import type { CategorieRef, FormatRef, SectionRef } from '../../api/types'

/**
 * Recherche d'une catégorie par le bénévole, entièrement sur le téléphone (hors ligne) : sur le nom des catégories,
 * de leur section, de leurs variantes et sur leurs mots-clés. Sans tenir compte des accents ni des majuscules,
 * sur les débuts de mots, au singulier comme au pluriel (« lentille » trouve « lentilles »).
 */

export interface ResultatRecherche {
  categorie: CategorieRef
  /** Variante trouvée : la saisie s'ouvre directement sur ce bouton */
  bouton?: FormatRef
  /** Mot-clé qui a permis de trouver la catégorie (affiché pour que le bénévole comprenne le résultat) */
  motCle?: string
}

export const NB_RESULTATS = 6

/** « Pâtes, Semoule » → « pates semoule » */
export function normaliser(texte: string): string {
  return texte
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/** Mots normalisés, au singulier (« lentilles » → « lentille », « noix » → « noi » des deux côtés) */
export function mots(texte: string): string[] {
  return normaliser(texte)
    .split(' ')
    .filter(Boolean)
    .map((mot) => (mot.length > 3 && /[sx]$/.test(mot) ? mot.slice(0, -1) : mot))
}

/** Chaque mot cherché commence un mot du texte */
const trouve = (cherches: string[], texte: string[]) => cherches.every((c) => texte.some((m) => m.startsWith(c)))
const touche = (cherches: string[], texte: string[]) => cherches.some((c) => texte.some((m) => m.startsWith(c)))

export function rechercher(
  requete: string,
  categories: CategorieRef[],
  sections: SectionRef[] = [],
  max = NB_RESULTATS,
): ResultatRecherche[] {
  const cherches = mots(requete)
  if (cherches.length === 0) {
    return []
  }
  const nomSection = new Map(sections.map((s) => [s.id, s.nom]))

  const resultats: { resultat: ResultatRecherche; score: number }[] = []
  for (const categorie of categories) {
    const nom = mots(categorie.nom)
    const contexte = [...nom, ...mots(categorie.sectionId == null ? '' : (nomSection.get(categorie.sectionId) ?? ''))]
    const motsCles = categorie.motsCles ?? []
    const tout = [...contexte, ...motsCles.flatMap(mots)]
    if (!trouve(cherches, [...tout, ...(categorie.boutons ?? []).flatMap((b) => mots(b.libelle ?? ''))])) {
      continue
    }

    // Variantes désignées par la recherche (« tournesol », « T4 ») : plus précises que la catégorie
    const variantes = (categorie.boutons ?? []).filter((b) => {
      const libelle = mots(b.libelle ?? '')
      return libelle.length > 0 && touche(cherches, libelle) && trouve(cherches, [...libelle, ...tout])
    })
    if (variantes.length > 0) {
      resultats.push(...variantes.map((bouton) => ({ resultat: { categorie, bouton }, score: 3 })))
    } else if (trouve(cherches, contexte)) {
      resultats.push({ resultat: { categorie }, score: trouve(cherches, nom) ? 3 : 2 })
    } else if (trouve(cherches, tout)) {
      const motCle = motsCles.find((m) => touche(cherches, mots(m)))
      resultats.push({ resultat: { categorie, motCle }, score: 1 })
    }
  }

  // Tri stable : à pertinence égale, l'ordre de la grille
  return resultats
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map((r) => r.resultat)
}
