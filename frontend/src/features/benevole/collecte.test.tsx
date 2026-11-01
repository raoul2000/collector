import { onlineManager } from '@tanstack/react-query'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { BilanPublic, Referentiel } from '../../api/types'
import { db } from '../../db/db'
import { enregistrerReferentiel } from '../../db/referentiel'
import { useBenevoleStore } from '../../stores/benevole'
import { useSyncStore } from '../../sync/syncStore'
import { fakeApi } from '../../test/fakeApi'
import { renderApp } from '../../test/renderApp'

const REFERENTIEL: Referentiel = {
  campagne: { id: 2, nom: 'Collecte 2026', dateDebut: '2026-11-27', dateFin: '2026-11-28', active: true },
  magasins: [
    { id: 4, nom: 'Lidl', ville: '' },
    { id: 5, nom: 'Super U', ville: '' },
  ],
  categories: [],
  version: 'v1',
}

/** Bilan d'une collecte en cours */
const BILAN: Extract<BilanPublic, { general: unknown }> = {
  campagne: { id: 2, nom: 'Collecte 2026', dateDebut: '2026-11-27', dateFin: '2026-11-28' },
  magasin: {
    magasinId: 4,
    totaux: { nbSaisies: 10, nbArticles: 318, grammes: 120500, millilitres: 25000, sansContenance: 2 },
    categories: [
      { categorieId: 3, nom: 'Savon', unite: 'unite', nbSaisies: 2, nbArticles: 12, contenance: null, sansContenance: 0 },
      { categorieId: 1, nom: 'Pâtes', unite: 'kg', nbSaisies: 8, nbArticles: 40, contenance: 20000, sansContenance: 2 },
    ],
  },
  general: { nbSaisies: 50, nbArticles: 1498, grammes: 654400, millilitres: 119500, sansContenance: 63 },
  classement: [
    { magasinId: 5, nom: 'Super U', ville: '', nbSaisies: 30, nbArticles: 366, grammes: 150000, millilitres: 30000, sansContenance: 0 },
    { magasinId: 4, nom: 'Lidl', ville: '', nbSaisies: 10, nbArticles: 318, grammes: 120500, millilitres: 25000, sansContenance: 2 },
  ],
}

const SYNC_VIDE = { body: { resultats: [], changements: [], curseur: '2026-11-27 10:00:00.000' } }

beforeEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()))
  await enregistrerReferentiel(REFERENTIEL)
  useBenevoleStore.setState({ appareilId: '11111111-1111-4111-8111-111111111111', prenom: 'Marie', magasinId: 4 })
  useSyncStore.setState({ enCours: false, enLigne: true, derniereSynchro: null, erreur: null })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('Produits à privilégier', () => {
  const CATEGORIES = [
    { id: 1, nom: 'Huile', unite: 'L' as const, formats: [] },
    { id: 2, nom: 'Café', unite: 'kg' as const, formats: [] },
  ]
  const avecListe = (privilegiees: number[], version: string): Referentiel => ({ ...REFERENTIEL, categories: CATEGORIES, privilegiees, version })
  const api = () =>
    fakeApi({
      'GET /api/bilans?magasin=4': { body: BILAN },
      'GET /api/referentiel': { body: REFERENTIEL },
      'POST /api/sync': SYNC_VIDE,
    })

  it('affiche « Aucun produit à privilégier » quand la liste est vide', async () => {
    api()
    renderApp('/collecte')

    expect(await screen.findByText('Aucun produit à privilégier')).toBeInTheDocument()
  })

  it('liste les produits, sans réseau aussi', { timeout: 10_000 }, async () => {
    await enregistrerReferentiel(avecListe([2, 1], 'v2'))
    fakeApi({
      'GET /api/bilans?magasin=4': { status: 503, body: { error: { code: 'x', message: 'Indisponible' } } },
      'GET /api/referentiel': { body: avecListe([2, 1], 'v2') },
      'POST /api/sync': SYNC_VIDE,
    } as never)
    renderApp('/collecte')

    const liste = await screen.findByRole('list')
    expect(within(liste).getAllByRole('listitem').map((l) => l.textContent)).toEqual(['Café', 'Huile'])
    expect(await screen.findByText(/cette liste n'est peut-être plus à jour/, {}, { timeout: 8000 })).toBeInTheDocument()
  })

  it('signale l\'absence de réseau quand le téléphone est hors ligne', async () => {
    api()
    onlineManager.setOnline(false)
    try {
      renderApp('/collecte')
      expect(await screen.findByText(/cette liste n'est peut-être plus à jour/)).toBeInTheDocument()
      expect(screen.queryByText('Chargement…')).not.toBeInTheDocument()
    } finally {
      onlineManager.setOnline(true)
    }
  })

  it('signale un changement, jamais au premier téléchargement', async () => {
    await db.referentiel.clear()
    expect(await enregistrerReferentiel(avecListe([1], 'v2'))).toBe(false)
    expect((await db.referentiel.get('courant'))?.privilegieesNonVues).toBe(false)

    // Autre contenu, même liste (même dans un autre ordre)
    expect(await enregistrerReferentiel(avecListe([1], 'v3'))).toBe(false)
    expect(await enregistrerReferentiel(avecListe([1, 2], 'v4'))).toBe(true)
    expect(await enregistrerReferentiel(avecListe([2, 1], 'v5'))).toBe(false)
    expect((await db.referentiel.get('courant'))?.privilegieesNonVues).toBe(true)
    expect(await enregistrerReferentiel(avecListe([], 'v6'))).toBe(true)
  })

  it('affiche le point rouge jusqu\'à la visite de l\'onglet Collecte', async () => {
    const user = userEvent.setup()
    await enregistrerReferentiel(avecListe([1], 'v2'))
    fakeApi({
      'GET /api/bilans?magasin=4': { body: BILAN },
      'GET /api/referentiel': { body: avecListe([1], 'v2') },
      'POST /api/sync': SYNC_VIDE,
    })
    renderApp('/mes-saisies')

    await user.click(await screen.findByRole('link', { name: /liste des produits à privilégier modifiée/ }))

    expect(await screen.findByText('Huile')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('link', { name: 'Collecte' })).toBeInTheDocument())
    expect((await db.referentiel.get('courant'))?.privilegieesNonVues).toBe(false)
  })
})

describe('Notre collecte', () => {
  it('affiche les chiffres du magasin, le total général et le classement', async () => {
    fakeApi({
      'GET /api/referentiel': { body: REFERENTIEL },
      'POST /api/sync': SYNC_VIDE,
      'GET /api/bilans?magasin=4': { body: BILAN },
    })
    renderApp('/collecte')

    expect(await screen.findByRole('heading', { name: 'Lidl' })).toBeInTheDocument()
    expect(screen.getByText('Articles collectés').nextSibling).toHaveTextContent('318')
    expect(screen.getByText('120,5 kg')).toBeInTheDocument()

    // Catégories du magasin, de la plus collectée à la moins collectée
    const categories = within(screen.getByRole('list', { name: /par catégorie/ })).getAllByRole('listitem')
    expect(categories.map((c) => c.textContent)).toEqual(['Pâtes40 articles20 kg · dont 2 articles sans poids', 'Savon12 articles'])

    expect(screen.getByText(/Ensemble, nous avons collecté/)).toHaveTextContent('1 498 articles, soit 654,4 kg et 119,5 L')

    // Classement : notre magasin est mis en avant
    const classement = within(screen.getByRole('list', { name: /Classement/ })).getAllByRole('listitem')
    expect(classement[0]).toHaveTextContent('1Super U366')
    expect(classement[1]).toHaveTextContent('2Lidl318')
    expect(classement[1]).toHaveClass('enAvant')
    expect(classement[0]).not.toHaveClass('enAvant')
  })

  it('explique que les chiffres nécessitent une connexion', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))))
    renderApp('/collecte')

    expect(await screen.findByText('Les chiffres de la collecte s\'affichent quand le téléphone est connecté.', {}, { timeout: 5000 })).toBeInTheDocument()
  })

  it('signale l’absence de collecte en cours', async () => {
    fakeApi({
      'GET /api/referentiel': { body: REFERENTIEL },
      'POST /api/sync': SYNC_VIDE,
      'GET /api/bilans?magasin=4': { body: { campagne: null } },
    })
    renderApp('/collecte')

    expect(await screen.findByText('Aucune collecte n\'est en cours.')).toBeInTheDocument()
  })
})

describe('Notre collecte : liste des catégories', () => {
  it('n’affiche d’abord que les six catégories les plus collectées', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()
    const categories = Array.from({ length: 8 }, (_, i) => ({
      categorieId: i + 1,
      nom: `Catégorie ${i + 1}`,
      unite: 'unite' as const,
      nbSaisies: 1,
      nbArticles: 10 + i,
      contenance: null,
      sansContenance: 0,
    }))
    fakeApi({
      'GET /api/referentiel': { body: REFERENTIEL },
      'POST /api/sync': SYNC_VIDE,
      'GET /api/bilans?magasin=4': { body: { ...BILAN, magasin: { ...BILAN.magasin!, categories } } },
    })
    renderApp('/collecte')

    const liste = await screen.findByRole('list', { name: /par catégorie/ })
    expect(within(liste).getAllByRole('listitem')).toHaveLength(6)
    expect(within(liste).getAllByRole('listitem')[0]).toHaveTextContent('Catégorie 8')

    await user.click(screen.getByRole('button', { name: 'Voir les 2 autres catégories' }))
    expect(within(screen.getByRole('list', { name: /par catégorie/ })).getAllByRole('listitem')).toHaveLength(8)
  })
})
