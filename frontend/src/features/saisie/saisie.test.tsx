import { GARDE_ANNULATION_MS } from './SaisiePage'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Referentiel } from '../../api/types'
import { db } from '../../db/db'
import { enregistrerReferentiel } from '../../db/referentiel'
import { creerSaisie } from '../../db/saisies'
import { useBenevoleStore } from '../../stores/benevole'
import { useSyncStore } from '../../sync/syncStore'
import { renderApp } from '../../test/renderApp'
import { libelleSaisie } from './libelle'
import { grouperParSection } from './sections'

const PATES = { id: 1, nom: 'Pâtes', unite: 'kg' as const, formats: [250, 500, 1000] }
const HUILE = { id: 2, nom: 'Huile', unite: 'L' as const, formats: [1000] }
const SAVON = { id: 3, nom: 'Savon', unite: 'unite' as const, formats: [] }

const REFERENTIEL: Referentiel = {
  campagne: { id: 7, nom: 'Collecte 2026', dateDebut: '2026-11-27', dateFin: '2026-11-28', active: true },
  magasins: [{ id: 4, nom: 'Lidl', ville: '' }],
  categories: [PATES, HUILE, SAVON],
  version: 'v1',
}

async function demarrer(referentiel: Referentiel = REFERENTIEL) {
  await enregistrerReferentiel(referentiel)
  renderApp('/')
  return userEvent.setup()
}

async function saisies() {
  return db.saisies.toArray()
}

beforeEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()))
  useBenevoleStore.setState({ appareilId: '11111111-1111-4111-8111-111111111111', prenom: 'Marie', magasinId: 4 })
  useSyncStore.setState({ enCours: false, enLigne: true, derniereSynchro: null, erreur: null })
  // Pas de réseau : les saisies restent sur le téléphone
  vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('Écran de saisie', () => {
  it('enregistre une saisie en trois touches et revient aux catégories', async () => {
    const user = await demarrer()

    await user.click(await screen.findByRole('button', { name: /Pâtes/ }))
    await user.click(screen.getByRole('button', { name: '500 g' }))
    await user.click(screen.getByRole('button', { name: 'Valider' }))

    expect(await screen.findByText('1 × Pâtes 500 g')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Huile/ })).toBeInTheDocument()
    await waitFor(async () =>
      expect(await saisies()).toEqual([
        expect.objectContaining({ campagneId: 7, magasinId: 4, categorieId: 1, quantite: 1, contenanceUnitaire: 500, aEnvoyer: 1 }),
      ]),
    )
  })

  it('exige le choix du poids', async () => {
    const user = await demarrer()

    await user.click(await screen.findByRole('button', { name: /Pâtes/ }))
    await user.click(screen.getByRole('button', { name: 'Valider' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Choisissez le poids de l\'article.')
    expect(await saisies()).toHaveLength(0)
  })

  it('accepte un poids libre et une quantité', async () => {
    const user = await demarrer()

    await user.click(await screen.findByRole('button', { name: /Pâtes/ }))
    await user.click(screen.getByRole('button', { name: 'Autre…' }))
    await user.type(screen.getByLabelText('Poids indiqué sur l\'emballage'), '1,5')
    await user.selectOptions(screen.getByLabelText('Unité'), 'kg')
    await user.click(screen.getByRole('button', { name: 'Augmenter la quantité' }))
    await user.click(screen.getByRole('button', { name: 'Augmenter la quantité' }))
    await user.click(screen.getByRole('button', { name: 'Valider' }))

    expect(await screen.findByText('3 × Pâtes 1,5 kg')).toBeInTheDocument()
    await waitFor(async () => expect((await saisies())[0]).toMatchObject({ quantite: 3, contenanceUnitaire: 1500 }))
  })

  it('refuse un poids libre invalide ou trop élevé', async () => {
    const user = await demarrer()

    await user.click(await screen.findByRole('button', { name: /Pâtes/ }))
    await user.click(screen.getByRole('button', { name: 'Autre…' }))
    await user.type(screen.getByLabelText('Poids indiqué sur l\'emballage'), 'abc')
    await user.click(screen.getByRole('button', { name: 'Valider' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Saisissez un poids valide.')

    await user.clear(screen.getByLabelText('Poids indiqué sur l\'emballage'))
    await user.type(screen.getByLabelText('Poids indiqué sur l\'emballage'), '30')
    await user.selectOptions(screen.getByLabelText('Unité'), 'kg')
    await user.click(screen.getByRole('button', { name: 'Valider' }))
    expect(screen.getByRole('alert')).toHaveTextContent('La contenance ne doit pas dépasser 25 kg.')
    expect(await saisies()).toHaveLength(0)
  })

  it('demande confirmation pour une contenance inconnue', async () => {
    const user = await demarrer()

    await user.click(await screen.findByRole('button', { name: /Huile/ }))
    await user.click(screen.getByRole('button', { name: /Inconnu/ }))
    await user.click(screen.getByRole('button', { name: 'Valider' }))

    const dialog = screen.getByRole('dialog', { name: 'Confirmer la saisie ?' })
    expect(dialog).toHaveTextContent('Le volume de ces articles ne sera pas comptabilisé.')
    await user.click(within(dialog).getByRole('button', { name: 'Confirmer' }))

    expect(await screen.findByText('1 × Huile (contenance inconnue)')).toBeInTheDocument()
    await waitFor(async () => expect((await saisies())[0]).toMatchObject({ categorieId: 2, contenanceUnitaire: null }))
  })

  it('demande confirmation pour une quantité inhabituelle, et permet de corriger', async () => {
    const user = await demarrer()

    await user.click(await screen.findByRole('button', { name: /Savon/ }))
    const quantite = screen.getByLabelText('Nombre d\'articles')
    await user.clear(quantite)
    await user.type(quantite, '80')
    await user.click(screen.getByRole('button', { name: 'Valider' }))

    expect(screen.getByRole('dialog')).toHaveTextContent('La quantité est inhabituelle : 80 articles.')
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Annuler' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(await saisies()).toHaveLength(0)
    expect(quantite).toHaveValue('80')
  })

  it('n’affiche pas de contenance pour une catégorie à l’unité', async () => {
    const user = await demarrer()

    await user.click(await screen.findByRole('button', { name: /Savon/ }))

    expect(screen.queryByRole('group')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Valider' }))
    expect(await screen.findByText('1 × Savon')).toBeInTheDocument()
  })

  it('annule la dernière saisie', async () => {
    const user = await demarrer()

    await user.click(await screen.findByRole('button', { name: /Savon/ }))
    await user.click(screen.getByRole('button', { name: 'Valider' }))
    const annuler = await screen.findByRole('button', { name: 'Annuler' })

    // Un double appui sur « Valider » ne doit pas annuler la saisie
    await user.click(annuler)
    expect((await saisies())[0]).toMatchObject({ supprime: false })

    await new Promise((resolve) => setTimeout(resolve, GARDE_ANNULATION_MS + 50))
    await user.click(annuler)

    expect(await screen.findByText('Saisie annulée : 1 × Savon')).toBeInTheDocument()
    await waitFor(async () => expect((await saisies())[0]).toMatchObject({ supprime: true, aEnvoyer: 1 }))
  })

  it('remonte en haut de la page à l\'ouverture d\'une catégorie', async () => {
    const user = await demarrer()
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)

    await user.click(await screen.findByRole('button', { name: /Pâtes/ }))

    expect(scrollTo).toHaveBeenCalledWith({ top: 0 })
    scrollTo.mockRestore()
  })

  it('retire le bandeau de confirmation quand le bénévole passe au don suivant', async () => {
    const user = await demarrer()

    await user.click(await screen.findByRole('button', { name: /Savon/ }))
    await user.click(screen.getByRole('button', { name: 'Valider' }))
    expect(await screen.findByRole('button', { name: 'Annuler' })).toBeInTheDocument()

    await user.click(screen.getAllByRole('button', { name: /Pâtes/ })[0]!)
    expect(screen.queryByRole('button', { name: 'Annuler' })).not.toBeInTheDocument()
  })

  it('permet de revenir aux catégories sans rien enregistrer', async () => {
    const user = await demarrer()

    await user.click(await screen.findByRole('button', { name: /Pâtes/ }))
    await user.click(screen.getByRole('button', { name: 'Changer de catégorie' }))

    expect(screen.getByRole('button', { name: /Huile/ })).toBeInTheDocument()
    expect(await saisies()).toHaveLength(0)
  })

  it('regroupe les catégories par section, avec une barre de raccourcis', async () => {
    const scrollIntoView = vi.fn()
    Element.prototype.scrollIntoView = scrollIntoView
    const user = await demarrer({
      ...REFERENTIEL,
      sections: [{ id: 1, nom: 'Épicerie' }, { id: 2, nom: 'Hygiène' }],
      categories: [{ ...PATES, sectionId: 1 }, { ...HUILE, sectionId: 1 }, { ...SAVON, sectionId: 2 }, { ...SAVON, id: 9, nom: 'Divers', sectionId: null }],
    })

    const epicerie = await screen.findByRole('region', { name: 'Épicerie' })
    expect(within(epicerie).getAllByRole('button').map((b) => b.textContent)).toEqual([expect.stringMatching(/^Pâtes/), expect.stringMatching(/^Huile/)])
    expect(within(screen.getByRole('region', { name: 'Hygiène' })).getByRole('button', { name: /Savon/ })).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Autres' })).getByRole('button', { name: /Divers/ })).toBeInTheDocument()

    const barre = screen.getByRole('navigation', { name: 'Sections' })
    expect(within(barre).getAllByRole('button').map((b) => b.textContent)).toEqual(['Épicerie', 'Hygiène', 'Autres'])
    await user.click(within(barre).getByRole('button', { name: 'Hygiène' }))
    expect(scrollIntoView).toHaveBeenCalledOnce()
    expect(scrollIntoView.mock.contexts[0]).toBe(screen.getByRole('heading', { name: 'Hygiène' }))

    // La saisie se poursuit comme sans sections
    await user.click(within(epicerie).getByRole('button', { name: /Pâtes/ }))
    expect(screen.getByRole('heading', { name: 'Pâtes' })).toBeInTheDocument()
  })

  it('distingue deux variantes de même contenance', async () => {
    const huile = {
      ...HUILE,
      boutons: [
        { id: 21, contenance: 1000, libelle: 'Olive / colza' },
        { id: 22, contenance: 1000, libelle: 'Tournesol, autres' },
        { id: 23, contenance: 500, libelle: null },
      ],
    }
    const user = await demarrer({ ...REFERENTIEL, categories: [PATES, huile, SAVON] })

    await user.click(await screen.findByRole('button', { name: /Huile/ }))
    expect(screen.getByRole('button', { name: '50 cl' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Tournesol/ }))
    expect(screen.getByRole('button', { name: /Tournesol/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /Olive/ })).toHaveAttribute('aria-pressed', 'false')
    await user.click(screen.getByRole('button', { name: 'Valider' }))

    expect(await screen.findByText('1 × Huile Tournesol, autres 1 L')).toBeInTheDocument()
    await waitFor(async () => expect(await saisies()).toEqual([expect.objectContaining({ categorieId: 2, contenanceUnitaire: 1000, formatId: 22 })]))
  })

  it('propose les variantes d’une catégorie à l’unité, sans les imposer', async () => {
    const couches = { id: 5, nom: 'Couches', unite: 'unite' as const, formats: [], boutons: [{ id: 31, contenance: null, libelle: 'T3' }, { id: 32, contenance: null, libelle: 'T4' }] }
    const user = await demarrer({ ...REFERENTIEL, categories: [PATES, couches] })

    await user.click(await screen.findByRole('button', { name: /Couches/ }))
    await user.click(screen.getByRole('button', { name: 'Valider' }))
    expect(await screen.findByText('1 × Couches')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Couches/ }))
    await user.click(screen.getByRole('button', { name: 'T3' }))
    await user.click(screen.getByRole('button', { name: 'T3' }))
    expect(screen.getByRole('button', { name: 'T3' })).toHaveAttribute('aria-pressed', 'false')
    await user.click(screen.getByRole('button', { name: 'T4' }))
    await user.click(screen.getByRole('button', { name: 'Valider' }))
    expect(await screen.findByText('1 × Couches T4')).toBeInTheDocument()

    await waitFor(async () =>
      expect((await saisies()).map((s) => s.formatId).sort()).toEqual([32, null]),
    )
  })

  it('un poids libre n’est rattaché à aucun bouton', async () => {
    const pates = { ...PATES, boutons: [{ id: 41, contenance: 500, libelle: null }] }
    const user = await demarrer({ ...REFERENTIEL, categories: [pates] })

    await user.click(await screen.findByRole('button', { name: /Pâtes/ }))
    await user.click(screen.getByRole('button', { name: 'Autre…' }))
    await user.type(screen.getByLabelText('Poids indiqué sur l\'emballage'), '500')
    await user.click(screen.getByRole('button', { name: 'Valider' }))

    await waitFor(async () => expect(await saisies()).toEqual([expect.objectContaining({ contenanceUnitaire: 500, formatId: null })]))
  })

  it('propose les catégories récentes en haut d’une grille longue', async () => {
    const categories = Array.from({ length: 10 }, (_, i) => ({ ...SAVON, id: 100 + i, nom: `Catégorie ${i}` }))
    const base = { campagneId: 7, magasinId: 4, quantite: 1, contenanceUnitaire: null }
    await creerSaisie({ ...base, categorieId: 101 }, new Date('2026-10-01T09:00:00Z'))
    await creerSaisie({ ...base, categorieId: 105 }, new Date('2026-10-01T09:01:00Z'))
    await creerSaisie({ ...base, categorieId: 101 }, new Date('2026-10-01T09:02:00Z'))
    const supprimee = await creerSaisie({ ...base, categorieId: 107 }, new Date('2026-10-01T09:03:00Z'))
    await db.saisies.update(supprimee.id, { supprime: true })
    // Catégorie retirée de la collecte
    await creerSaisie({ ...base, categorieId: 999 }, new Date('2026-10-01T09:04:00Z'))

    const user = await demarrer({ ...REFERENTIEL, categories })

    const recents = await screen.findByRole('region', { name: 'Récents' })
    expect(within(recents).getAllByRole('button').map((b) => b.textContent)).toEqual(['Catégorie 1', 'Catégorie 5'])

    await user.click(within(recents).getByRole('button', { name: 'Catégorie 5' }))
    expect(screen.getByRole('heading', { name: 'Catégorie 5' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Valider' }))

    await waitFor(() =>
      expect(within(screen.getByRole('region', { name: 'Récents' })).getAllByRole('button').map((b) => b.textContent)).toEqual([
        'Catégorie 5',
        'Catégorie 1',
      ]),
    )
  })

  it('n’affiche pas de récents pour une grille courte', async () => {
    await creerSaisie({ campagneId: 7, magasinId: 4, categorieId: 1, quantite: 1, contenanceUnitaire: 500 })
    await demarrer()

    expect(await screen.findByRole('button', { name: /Pâtes/ })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Récents' })).not.toBeInTheDocument()
  })

  it('trouve une catégorie ou une variante par la recherche', async () => {
    const huile = {
      ...HUILE,
      motsCles: ['friture'],
      boutons: [
        { id: 21, contenance: 1000, libelle: 'Olive / colza' },
        { id: 22, contenance: 1000, libelle: 'Tournesol, autres' },
      ],
    }
    const autre = { ...SAVON, id: 9, nom: 'Autre' }
    const user = await demarrer({ ...REFERENTIEL, categories: [PATES, huile, SAVON, autre] })
    const champ = await screen.findByRole('searchbox', { name: 'Rechercher un produit' })

    await user.type(champ, 'tournesol')
    const resultats = screen.getByRole('region', { name: 'Résultats de la recherche' })
    expect(within(resultats).getAllByRole('button')).toHaveLength(1)
    expect(screen.queryByRole('button', { name: /Pâtes/ })).not.toBeInTheDocument()
    await user.click(within(resultats).getByRole('button', { name: /Huile/ }))

    // La saisie s'ouvre sur la variante trouvée
    expect(screen.getByRole('heading', { name: 'Huile' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Tournesol/ })).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('button', { name: 'Valider' }))
    await waitFor(async () => expect(await saisies()).toEqual([expect.objectContaining({ categorieId: 2, formatId: 22 })]))

    // Mot-clé, puis aucun résultat : la catégorie « Autre » reste proposée
    const champ2 = screen.getByRole('searchbox', { name: 'Rechercher un produit' })
    expect(champ2).toHaveValue('')
    await user.type(champ2, 'friture')
    expect(within(screen.getByRole('region', { name: 'Résultats de la recherche' })).getByRole('button')).toHaveTextContent('friture')
    await user.clear(champ2)
    await user.type(champ2, 'gnocchi')
    expect(screen.getByText('Aucune catégorie ne correspond à « gnocchi ».')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Autre/ })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Voir toutes les catégories' }))
    expect(champ2).toHaveValue('')
    expect(screen.getByRole('button', { name: /Pâtes/ })).toBeInTheDocument()
  })

  it('mémorise une recherche sans résultat avec la catégorie choisie ensuite', async () => {
    const autre = { ...SAVON, id: 9, nom: 'Autre' }
    const user = await demarrer({ ...REFERENTIEL, categories: [PATES, HUILE, SAVON, autre] })
    const champ = await screen.findByRole('searchbox', { name: 'Rechercher un produit' })

    await user.type(champ, 'gnocchi')
    await user.click(screen.getByRole('button', { name: 'Voir toutes les catégories' }))
    await user.click(screen.getByRole('button', { name: /Pâtes/ }))
    await waitFor(async () => expect(await db.recherches.toArray()).toEqual([expect.objectContaining({ campagneId: 7, terme: 'gnocchi', categorieId: 1 })]))
    await user.click(screen.getByRole('button', { name: 'Changer de catégorie' }))

    // Une recherche fructueuse n'est pas mémorisée
    await user.type(screen.getByRole('searchbox', { name: 'Rechercher un produit' }), 'huile')
    await user.click(screen.getByRole('button', { name: /Huile/ }))
    await user.click(screen.getByRole('button', { name: 'Changer de catégorie' }))

    await user.type(screen.getByRole('searchbox', { name: 'Rechercher un produit' }), 'boulgour')
    await user.click(screen.getByRole('button', { name: /Autre/ }))

    await waitFor(async () =>
      expect((await db.recherches.toArray()).map((r) => [r.terme, r.categorieId]).sort()).toEqual([
        ['boulgour', 9],
        ['gnocchi', 1],
      ]),
    )
  })

  it('affiche une grille simple sans sections', async () => {
    await demarrer()

    expect(await screen.findByRole('button', { name: /Pâtes/ })).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Sections' })).not.toBeInTheDocument()
    expect(screen.queryByRole('region')).not.toBeInTheDocument()
  })

  it('bloque la saisie sans collecte en cours', async () => {
    await demarrer({ ...REFERENTIEL, campagne: null })

    expect(await screen.findByText('Aucune collecte n\'est en cours : la saisie n\'est pas disponible.')).toBeInTheDocument()
  })
})

describe('libelleSaisie', () => {
  it('décrit une saisie', () => {
    expect(libelleSaisie(PATES, 2, 500)).toBe('2 × Pâtes 500 g')
    expect(libelleSaisie(HUILE, 1, 500)).toBe('1 × Huile 50 cl')
    expect(libelleSaisie(HUILE, 1, null)).toBe('1 × Huile (contenance inconnue)')
    expect(libelleSaisie(SAVON, 4, null)).toBe('4 × Savon')
    expect(libelleSaisie(undefined, 1, 500)).toBe('1 × Catégorie inconnue')
    expect(libelleSaisie(HUILE, 2, 1000, 'Olive / colza')).toBe('2 × Huile Olive / colza 1 L')
    expect(libelleSaisie(SAVON, 3, null, 'Parfumé')).toBe('3 × Savon Parfumé')
  })
})

describe('grouperParSection', () => {
  it('suit l’ordre des sections et place les catégories sans section à la fin', () => {
    const groupes = grouperParSection({
      sections: [{ id: 2, nom: 'B' }, { id: 1, nom: 'A' }, { id: 3, nom: 'Vide' }],
      categories: [{ ...SAVON, sectionId: null }, { ...PATES, sectionId: 1 }, { ...HUILE, sectionId: 2 }, { ...HUILE, id: 8, sectionId: 99 }],
    })

    expect(groupes.map((g) => [g.section?.nom ?? null, g.categories.map((c) => c.id)])).toEqual([
      ['B', [2]],
      ['A', [1]],
      [null, [3, 8]],
    ])
  })

  it('accepte une ancienne copie locale, sans sections', () => {
    expect(grouperParSection({ categories: [PATES, HUILE] })).toEqual([{ section: null, categories: [PATES, HUILE] }])
  })
})
