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

const REFERENTIEL: Referentiel = {
  campagne: { id: 7, nom: 'Collecte 2026', dateDebut: '2026-11-27', dateFin: '2026-11-28', active: true },
  magasins: [
    { id: 4, nom: 'Lidl', ville: '' },
    { id: 5, nom: 'Auchan', ville: '' },
  ],
  categories: [
    { id: 1, nom: 'Pâtes', unite: 'kg', formats: [250, 500] },
    { id: 3, nom: 'Savon', unite: 'unite', formats: [] },
  ],
  version: 'v1',
}

const BASE = { campagneId: 7, magasinId: 4, categorieId: 1, quantite: 2, contenanceUnitaire: 500 }

beforeEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()))
  await enregistrerReferentiel(REFERENTIEL)
  useBenevoleStore.setState({ appareilId: '11111111-1111-4111-8111-111111111111', prenom: 'Marie', magasinId: 4 })
  useSyncStore.setState({ enCours: false, enLigne: true, derniereSynchro: null, erreur: null })
  vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('Mes saisies', () => {
  it('liste les saisies par jour avec leur état', async () => {
    const envoyee = await creerSaisie(BASE, new Date('2026-11-27T09:00:00Z'))
    await db.saisies.update(envoyee.id, { aEnvoyer: 0 })
    const corrigee = await creerSaisie({ ...BASE, quantite: 3 }, new Date('2026-11-27T10:30:00Z'))
    await db.saisies.update(corrigee.id, { aEnvoyer: 0, corrigeParResponsable: 'Paul' })
    const refusee = await creerSaisie({ ...BASE, categorieId: 3, contenanceUnitaire: null }, new Date('2026-11-28T08:00:00Z'))
    await db.saisies.update(refusee.id, { aEnvoyer: 0, erreur: 'Catégorie inconnue.' })
    await creerSaisie({ ...BASE, magasinId: 5, quantite: 1 }, new Date('2026-11-28T09:00:00Z'))
    const supprimee = await creerSaisie(BASE, new Date('2026-11-28T09:30:00Z'))
    await db.saisies.update(supprimee.id, { supprime: true })

    renderApp('/mes-saisies')

    expect(await screen.findByText('4 saisies · 8 articles')).toBeInTheDocument()
    const jours = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
    expect(jours).toEqual(['samedi 28 novembre', 'vendredi 27 novembre'])

    const lignes = screen.getAllByRole('listitem')
    expect(lignes).toHaveLength(4)
    expect(lignes[0]).toHaveTextContent('10:00')
    expect(lignes[0]).toHaveTextContent('1 × Pâtes 500 g')
    expect(lignes[0]).toHaveTextContent('Auchan')
    expect(lignes[0]).toHaveTextContent('En attente')
    expect(lignes[1]).toHaveTextContent('2 × Savon')
    expect(lignes[1]).toHaveTextContent('Refusée')
    expect(lignes[1]).toHaveTextContent('Catégorie inconnue.')
    expect(lignes[2]).toHaveTextContent('Corrigée par Paul')
    expect(lignes[3]).toHaveTextContent('Envoyée')
  })

  it('modifie une saisie, y compris sa catégorie', async () => {
    const user = userEvent.setup()
    const saisie = await creerSaisie(BASE)
    await db.saisies.update(saisie.id, { aEnvoyer: 0 })
    renderApp('/mes-saisies')

    await user.click(await screen.findByRole('button', { name: /2 × Pâtes 500 g/ }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByRole('button', { name: '500 g' })).toHaveAttribute('aria-pressed', 'true')

    await user.click(within(dialog).getByRole('button', { name: '250 g' }))
    await user.click(within(dialog).getByRole('button', { name: 'Augmenter la quantité' }))
    await user.click(within(dialog).getByRole('button', { name: 'Enregistrer' }))

    expect(await screen.findByText('Saisie modifiée.')).toBeInTheDocument()
    await waitFor(async () =>
      expect(await db.saisies.get(saisie.id)).toMatchObject({ quantite: 3, contenanceUnitaire: 250, aEnvoyer: 1 }),
    )

    await user.click(await screen.findByRole('button', { name: /3 × Pâtes 250 g/ }))
    await user.selectOptions(within(screen.getByRole('dialog')).getByLabelText('Catégorie'), 'Savon')
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Enregistrer' }))

    await waitFor(async () =>
      expect(await db.saisies.get(saisie.id)).toMatchObject({ categorieId: 3, quantite: 1, contenanceUnitaire: null }),
    )
  })

  it('supprime une saisie après confirmation', async () => {
    const user = userEvent.setup()
    const saisie = await creerSaisie(BASE)
    renderApp('/mes-saisies')

    await user.click(await screen.findByRole('button', { name: /2 × Pâtes 500 g/ }))
    await user.click(screen.getByRole('button', { name: 'Supprimer cette saisie' }))
    await user.click(within(screen.getByRole('dialog', { name: 'Supprimer la saisie ?' })).getByRole('button', { name: 'Supprimer' }))

    expect(await screen.findByText('Aucune saisie depuis ce téléphone pour l\'instant.')).toBeInTheDocument()
    expect(await db.saisies.get(saisie.id)).toMatchObject({ supprime: true, aEnvoyer: 1 })
  })
})
