import { describe, expect, it } from 'vitest'
import type { CategorieRef } from '../../api/types'
import { mots, normaliser, rechercher } from './recherche'

const SECTIONS = [
  { id: 1, nom: 'Épicerie salée' },
  { id: 2, nom: 'Conserves' },
  { id: 3, nom: 'Bébé' },
]

const categorie = (id: number, nom: string, sectionId: number, extra: Partial<CategorieRef> = {}): CategorieRef => ({
  id,
  nom,
  sectionId,
  unite: 'kg',
  formats: [],
  boutons: [],
  motsCles: [],
  ...extra,
})

const PATES = categorie(1, 'Pâtes, semoule', 1, { motsCles: ['coquillettes', 'spaghetti'] })
const LEGUMES_SECS = categorie(2, 'Légumes secs', 1, { motsCles: ['lentilles', 'pois chiches'] })
const HUILE = categorie(3, 'Huile', 1, {
  unite: 'L',
  motsCles: ['olive'],
  boutons: [
    { id: 31, contenance: 1000, libelle: 'Olive / colza' },
    { id: 32, contenance: 1000, libelle: 'Tournesol, autres' },
  ],
})
const CONSERVES_LEGUMES = categorie(4, 'Conserves de légumes', 2, { motsCles: ['haricots verts'] })
const LEGUMINEUSES = categorie(5, 'Légumineuses en conserve', 2, { motsCles: ['lentilles', 'haricots blancs'] })
const COUCHES = categorie(6, 'Couches', 3, {
  unite: 'unite',
  boutons: [
    { id: 61, contenance: null, libelle: 'T3' },
    { id: 62, contenance: null, libelle: 'T4' },
  ],
})
const CATEGORIES = [PATES, LEGUMES_SECS, HUILE, CONSERVES_LEGUMES, LEGUMINEUSES, COUCHES]

const chercher = (requete: string) =>
  rechercher(requete, CATEGORIES, SECTIONS).map((r) => [r.categorie.nom, r.bouton?.libelle ?? r.motCle ?? null])

describe('Recherche d’une catégorie', () => {
  it('ignore accents, majuscules et pluriel', () => {
    expect(normaliser('  Pâtes, SEMOULE ')).toBe('pates semoule')
    expect(mots('Lentilles noix pois')).toEqual(['lentille', 'noi', 'poi'])
    expect(chercher('PATE')).toEqual([['Pâtes, semoule', null]])
    expect(chercher('lentille')).toEqual([
      ['Légumes secs', 'lentilles'],
      ['Légumineuses en conserve', 'lentilles'],
    ])
  })

  it('cherche les débuts de mots, dans le nom, la section et les mots-clés', () => {
    expect(chercher('coqui')).toEqual([['Pâtes, semoule', 'coquillettes']])
    expect(chercher('conserve')).toEqual([
      ['Conserves de légumes', null],
      ['Légumineuses en conserve', null],
    ])
    expect(chercher('haricots blancs')).toEqual([['Légumineuses en conserve', 'haricots blancs']])
    expect(chercher('emoule')).toEqual([])
  })

  it('place les noms de catégorie avant les mots-clés', () => {
    expect(chercher('legume')).toEqual([
      ['Légumes secs', null],
      ['Conserves de légumes', null],
    ])
    const haricots = categorie(7, 'Haricots', 2)
    expect(rechercher('haricot', [CONSERVES_LEGUMES, haricots], SECTIONS).map((r) => r.categorie.nom)).toEqual([
      'Haricots',
      'Conserves de légumes',
    ])
  })

  it('mène directement aux variantes', () => {
    expect(chercher('tournesol')).toEqual([['Huile', 'Tournesol, autres']])
    expect(chercher('huile olive')).toEqual([['Huile', 'Olive / colza']])
    expect(chercher('t4')).toEqual([['Couches', 'T4']])
    expect(chercher('couches')).toEqual([['Couches', null]])
  })

  it('accepte une copie locale sans mots-clés ni boutons', () => {
    expect(rechercher('riz', [{ id: 9, nom: 'Riz', unite: 'kg', formats: [500] }])).toEqual([
      { categorie: { id: 9, nom: 'Riz', unite: 'kg', formats: [500] } },
    ])
    expect(rechercher('   ', CATEGORIES)).toEqual([])
  })
})
