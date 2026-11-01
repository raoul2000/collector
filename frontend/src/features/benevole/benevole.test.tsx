import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Referentiel } from '../../api/types'
import { db } from '../../db/db'
import { enregistrerReferentiel } from '../../db/referentiel'
import { creerSaisie } from '../../db/saisies'
import { useBenevoleStore } from '../../stores/benevole'
import { useSyncStore } from '../../sync/syncStore'
import { fakeApi } from '../../test/fakeApi'
import { renderApp } from '../../test/renderApp'

const REFERENTIEL: Referentiel = {
  campagne: { id: 1, nom: 'Collecte 2026', dateDebut: '2026-11-27', dateFin: '2026-11-28', active: true },
  magasins: [
    { id: 1, nom: 'Carrefour Market', ville: 'Centre' },
    { id: 2, nom: 'Lidl', ville: '' },
  ],
  categories: [{ id: 1, nom: 'Pâtes', unite: 'kg', formats: [500] }],
  version: 'v1',
}

const SYNC_VIDE = { body: { resultats: [], changements: [], curseur: '2026-11-27 10:00:00.000' } }

beforeEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()))
  localStorage.clear()
  useBenevoleStore.setState({ appareilId: '11111111-1111-4111-8111-111111111111', prenom: null, magasinId: null })
  useBenevoleStore.setState({ theme: 'standard' })
  useSyncStore.setState({ enCours: false, enLigne: true, derniereSynchro: null, erreur: null })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('Premier lancement', () => {
  it('demande le prénom et le magasin, puis ouvre la saisie', async () => {
    const user = userEvent.setup()
    fakeApi({ 'GET /api/referentiel': { body: REFERENTIEL }, 'POST /api/sync': SYNC_VIDE })
    renderApp('/')

    expect(await screen.findByRole('heading', { name: 'Bienvenue !' })).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Navigation' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Commencer la saisie' }))
    expect(screen.getByText('Indiquez votre prénom.')).toBeInTheDocument()
    expect(screen.getByText('Choisissez votre magasin.')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Votre prénom'), ' Marie ')
    await user.click(screen.getByRole('radio', { name: /Lidl/ }))
    expect(screen.getByRole('radio', { name: /Lidl/ })).toHaveAttribute('aria-checked', 'true')
    await user.click(screen.getByRole('button', { name: 'Commencer la saisie' }))

    expect(await screen.findByRole('navigation', { name: 'Navigation' })).toBeInTheDocument()
    expect(within(screen.getAllByRole('banner')[0]!).getByText('Lidl')).toBeInTheDocument()
    expect(useBenevoleStore.getState()).toMatchObject({ prenom: 'Marie', magasinId: 2 })
    expect(JSON.parse(localStorage.getItem('collector-benevole')!).state).toMatchObject({ prenom: 'Marie', magasinId: 2 })
  })

  it('explique qu’une connexion est nécessaire au tout premier lancement', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))))
    renderApp('/')

    expect(await screen.findByText('Une connexion Internet est nécessaire au premier lancement.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Réessayer' })).toBeInTheDocument()
  })

  it('redemande le magasin s’il ne fait plus partie de la collecte', async () => {
    useBenevoleStore.setState({ prenom: 'Marie', magasinId: 99 })
    await enregistrerReferentiel(REFERENTIEL)
    fakeApi({ 'GET /api/referentiel': { body: REFERENTIEL }, 'POST /api/sync': SYNC_VIDE })
    renderApp('/')

    expect(await screen.findByRole('heading', { name: 'Bienvenue !' })).toBeInTheDocument()
    expect(screen.getByLabelText('Votre prénom')).toHaveValue('Marie')
  })
})

describe('Fonctionnement hors ligne', () => {
  it('démarre sans réseau avec le référentiel enregistré et signale les saisies en attente', async () => {
    useBenevoleStore.setState({ prenom: 'Marie', magasinId: 1 })
    await enregistrerReferentiel(REFERENTIEL)
    await creerSaisie({ campagneId: 1, magasinId: 1, categorieId: 1, quantite: 1, contenanceUnitaire: 500 })
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))))
    renderApp('/')

    expect(await screen.findByText(/Hors ligne · 1 en attente/)).toBeInTheDocument()
    // L'indicateur peut s'afficher avant la lecture du référentiel local : on attend le magasin
    expect(await screen.findByText('Carrefour Market · Centre')).toBeInTheDocument()
  })

  it('indique que tout est à jour après une synchronisation réussie', async () => {
    useBenevoleStore.setState({ prenom: 'Marie', magasinId: 1 })
    fakeApi({ 'GET /api/referentiel': { body: REFERENTIEL }, 'POST /api/sync': SYNC_VIDE })
    renderApp('/')

    expect(await screen.findByText('À jour')).toBeInTheDocument()
  })
})

describe('Réglages', () => {
  it('change le magasin et le prénom', async () => {
    const user = userEvent.setup()
    useBenevoleStore.setState({ prenom: 'Marie', magasinId: 1 })
    fakeApi({ 'GET /api/referentiel': { body: REFERENTIEL }, 'POST /api/sync': SYNC_VIDE })
    renderApp('/parametres')

    await user.click(await screen.findByRole('radio', { name: /Lidl/ }))
    expect(within(screen.getAllByRole('banner')[0]!).getByText('Lidl')).toBeInTheDocument()

    const champ = screen.getByLabelText('Prénom')
    await user.clear(champ)
    await user.type(champ, 'Marie-Claire')
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }))

    await waitFor(() => expect(useBenevoleStore.getState()).toMatchObject({ prenom: 'Marie-Claire', magasinId: 2 }))
  })
})
