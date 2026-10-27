import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Referentiel } from '../../api/types'
import { db } from '../../db/db'
import { enregistrerReferentiel } from '../../db/referentiel'
import { useBenevoleStore } from '../../stores/benevole'
import { useSyncStore } from '../../sync/syncStore'
import { renderApp } from '../../test/renderApp'
import { libelleSaisie } from './libelle'

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
    await user.click(await screen.findByRole('button', { name: 'Annuler' }))

    expect(await screen.findByText('Saisie annulée : 1 × Savon')).toBeInTheDocument()
    await waitFor(async () => expect((await saisies())[0]).toMatchObject({ supprime: true, aEnvoyer: 1 }))
  })

  it('permet de revenir aux catégories sans rien enregistrer', async () => {
    const user = await demarrer()

    await user.click(await screen.findByRole('button', { name: /Pâtes/ }))
    await user.click(screen.getByRole('button', { name: 'Changer de catégorie' }))

    expect(screen.getByRole('button', { name: /Huile/ })).toBeInTheDocument()
    expect(await saisies()).toHaveLength(0)
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
  })
})
