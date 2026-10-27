import { screen, within } from '@testing-library/react'
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
