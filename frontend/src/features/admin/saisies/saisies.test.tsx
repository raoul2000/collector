import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Campagne, Categorie, Magasin, PageSaisies, SaisieAdmin } from '../../../api/types'
import { fakeApi, SESSION_OK } from '../../../test/fakeApi'
import { renderApp } from '../../../test/renderApp'

afterEach(() => {
  vi.unstubAllGlobals()
})

const CAMPAGNES: Campagne[] = [
  { id: 2, nom: 'Collecte 2026', dateDebut: '2026-11-27', dateFin: '2026-11-28', active: true, magasinIds: [], nbSaisies: 2 },
  { id: 1, nom: 'Collecte 2025', dateDebut: '2025-11-28', dateFin: '2025-11-29', active: false, magasinIds: [], nbSaisies: 0 },
]

// Lidl et Auchan participent à la collecte 2026 ; Casino aussi mais il est désactivé ; Carrefour n'y participe pas
const CAMPAGNES_AVEC_MAGASINS: Campagne[] = [{ ...CAMPAGNES[0]!, magasinIds: [4, 5, 6] }, CAMPAGNES[1]!]

const MAGASINS: Magasin[] = [
  { id: 5, nom: 'Auchan', ville: '', actif: true, nbSaisies: 0 },
  { id: 7, nom: 'Carrefour', ville: '', actif: true, nbSaisies: 0 },
  { id: 6, nom: 'Casino', ville: '', actif: false, nbSaisies: 0 },
  { id: 4, nom: 'Lidl', ville: 'Centre', actif: true, nbSaisies: 2 },
]

const PATES: Categorie = { id: 1, nom: 'Pâtes', sectionId: null, unite: 'kg', ordre: 10, active: true, codeReference: null, motsCles: [], formats: [{ id: 11, contenance: 250, libelle: null }, { id: 12, contenance: 500, libelle: null }], nbSaisies: 1 }

const SAISIE: SaisieAdmin = {
  id: 'a1a1a1a1-0000-4000-8000-000000000001',
  campagneId: 2,
  magasinId: 4,
  categorieId: 1,
  quantite: 2,
  contenanceUnitaire: 500,
  saisieLe: '2026-11-27T10:15:00+01:00',
  modifieLe: '2026-11-27T10:15:00.000+01:00',
  supprime: false,
  corrigeParResponsable: null,
  prenom: 'Marie',
  magasinNom: 'Lidl',
  categorieNom: 'Pâtes',
  unite: 'kg',
  codeReference: null,
  formatId: 12,
  formatLibelle: null,
}

function page(saisies: SaisieAdmin[], total = saisies.length): { body: PageSaisies } {
  return { body: { saisies, total, page: 1, parPage: 50 } }
}

describe('Saisies (responsable)', () => {
  it('filtre par défaut sur la campagne active et affiche les saisies', async () => {
    const api = fakeApi({
      ...SESSION_OK,
      'GET /api/admin/campagnes': { body: CAMPAGNES },
      'GET /api/admin/magasins': { body: [] },
      'GET /api/admin/categories': { body: [PATES] },
      'GET /api/admin/saisies?page=1&parPage=50&campagne=2': page([SAISIE, { ...SAISIE, id: 'b', corrigeParResponsable: 'Paul' }]),
    })
    renderApp('/admin/saisies')

    expect(await screen.findByText('2 saisies')).toBeInTheDocument()
    const lignes = screen.getAllByRole('row').slice(1)
    expect(lignes[0]).toHaveTextContent('Lidl')
    expect(lignes[0]).toHaveTextContent('Marie')
    expect(lignes[0]).toHaveTextContent('2 × Pâtes 500 g')
    expect(lignes[1]).toHaveTextContent('Corrigée par Paul')
    expect(screen.getByLabelText('Campagne')).toHaveValue('2')
    expect(api.calls.filter((c) => c.path.includes('admin/saisies')).map((c) => c.path)).toEqual([
      '/api/admin/saisies?page=1&parPage=50&campagne=2',
    ])
  })

  it('filtre sur le prénom après une courte pause', async () => {
    const user = userEvent.setup()
    const api = fakeApi({
      ...SESSION_OK,
      'GET /api/admin/campagnes': { body: CAMPAGNES },
      'GET /api/admin/magasins': { body: [] },
      'GET /api/admin/categories': { body: [PATES] },
      'GET /api/admin/saisies?page=1&parPage=50&campagne=2': page([SAISIE]),
      'GET /api/admin/saisies?page=1&parPage=50&campagne=2&prenom=Paul': page([]),
    })
    renderApp('/admin/saisies')

    await user.type(await screen.findByLabelText('Bénévole'), 'Paul')

    expect(await screen.findByText('Aucune saisie ne correspond à ces critères.')).toBeInTheDocument()
    expect(api.calls.filter((c) => c.path.includes('prenom='))).toHaveLength(1)
  })

  it('affiche le code de référence et filtre sur le code', async () => {
    const user = userEvent.setup()
    const api = fakeApi({
      ...SESSION_OK,
      'GET /api/admin/campagnes': { body: CAMPAGNES },
      'GET /api/admin/magasins': { body: [] },
      'GET /api/admin/categories': { body: [PATES] },
      'GET /api/admin/saisies?page=1&parPage=50&campagne=2': page([{ ...SAISIE, codeReference: 'EPI-01' }, SAISIE]),
      'GET /api/admin/saisies?page=1&parPage=50&campagne=2&code=EPI': page([{ ...SAISIE, codeReference: 'EPI-01' }]),
      'GET /api/admin/saisies?page=1&parPage=50&campagne=2&sansCode=1': page([SAISIE]),
    })
    renderApp('/admin/saisies')

    expect(await screen.findByRole('columnheader', { name: 'Code' })).toBeInTheDocument()
    const lignes = screen.getAllByRole('row').slice(1)
    expect(lignes[0]).toHaveTextContent('EPI-01')
    expect(within(lignes[1]!).getByRole('button', { name: 'Ajouter un code de référence à « Pâtes »' })).toBeInTheDocument()

    await user.type(screen.getByLabelText('Code'), 'EPI')
    await waitFor(() => expect(api.calls.some((c) => c.path.endsWith('&code=EPI'))).toBe(true))
    expect(api.calls.filter((c) => c.path.includes('code='))).toHaveLength(1)

    // « Sans code » remplace la recherche sur le code, qui est désactivée
    await user.click(screen.getByLabelText('Sans code de référence'))
    await waitFor(() => expect(api.calls.some((c) => c.path.endsWith('&sansCode=1'))).toBe(true))
    expect(screen.getByLabelText('Code')).toBeDisabled()
  })

  it('ouvre la catégorie depuis une saisie sans code pour lui en ajouter un', async () => {
    const user = userEvent.setup()
    const api = fakeApi({
      ...SESSION_OK,
      'GET /api/admin/campagnes': { body: CAMPAGNES },
      'GET /api/admin/magasins': { body: [] },
      'GET /api/admin/categories': { body: [PATES] },
      'GET /api/admin/saisies?page=1&parPage=50&campagne=2': page([SAISIE]),
      'PUT /api/admin/categories/1': (body) => ({ body: { ...PATES, ...(body as object) } }),
    })
    renderApp('/admin/saisies')

    await user.click(await screen.findByRole('button', { name: 'Ajouter un code de référence à « Pâtes »' }))
    const dialog = screen.getByRole('dialog', { name: 'Modifier la catégorie' })
    await user.type(within(dialog).getByLabelText('Code de référence'), 'EPI-01')
    await user.click(within(dialog).getByRole('button', { name: /Enregistrer/ }))

    expect(await screen.findByText('Catégorie « Pâtes » enregistrée.')).toBeInTheDocument()
    expect(api.calls.find((c) => c.method === 'PUT')?.body).toMatchObject({ codeReference: 'EPI-01' })
    // La liste des saisies est rechargée pour afficher le nouveau code
    const put = api.calls.findIndex((c) => c.method === 'PUT')
    await waitFor(() => expect(api.calls.slice(put).some((c) => c.path.includes('admin/saisies'))).toBe(true))
  })

  it('corrige une saisie', async () => {
    const user = userEvent.setup()
    const api = fakeApi({
      ...SESSION_OK,
      'GET /api/admin/campagnes': { body: CAMPAGNES },
      'GET /api/admin/magasins': { body: [] },
      'GET /api/admin/categories': { body: [PATES] },
      'GET /api/admin/saisies?page=1&parPage=50&campagne=2': page([SAISIE]),
      [`PUT /api/admin/saisies/${SAISIE.id}`]: (body) => ({ body: { ...SAISIE, ...(body as object), corrigeParResponsable: 'Sophie' } }),
    })
    renderApp('/admin/saisies')

    await user.click(await screen.findByRole('button', { name: 'Corriger' }))
    const dialog = screen.getByRole('dialog', { name: 'Corriger la saisie de Marie' })
    expect(within(dialog).getByRole('button', { name: '500 g' })).toHaveAttribute('aria-pressed', 'true')
    await user.click(within(dialog).getByRole('button', { name: '250 g' }))
    await user.click(within(dialog).getByRole('button', { name: 'Enregistrer la correction' }))

    expect(await screen.findByText('Saisie corrigée.')).toBeInTheDocument()
    expect(api.calls.find((c) => c.method === 'PUT')?.body).toEqual({ magasinId: 4, categorieId: 1, quantite: 2, contenanceUnitaire: 250, formatId: 11 })
  })

  it('corrige le magasin d’une saisie parmi les magasins actifs de sa campagne', async () => {
    const user = userEvent.setup()
    const api = fakeApi({
      ...SESSION_OK,
      'GET /api/admin/campagnes': { body: CAMPAGNES_AVEC_MAGASINS },
      'GET /api/admin/magasins': { body: MAGASINS },
      'GET /api/admin/categories': { body: [PATES] },
      'GET /api/admin/saisies?page=1&parPage=50&campagne=2': page([SAISIE]),
      [`PUT /api/admin/saisies/${SAISIE.id}`]: (body) => ({ body: { ...SAISIE, ...(body as object) } }),
    })
    renderApp('/admin/saisies')

    await user.click(await screen.findByRole('button', { name: 'Corriger' }))
    const dialog = screen.getByRole('dialog', { name: 'Corriger la saisie de Marie' })
    const magasin = within(dialog).getByLabelText('Magasin')
    expect(magasin).toHaveValue('4')
    expect(within(magasin).getAllByRole('option').map((o) => o.textContent)).toEqual(['Auchan', 'Lidl – Centre'])
    await user.selectOptions(magasin, 'Auchan')
    await user.click(within(dialog).getByRole('button', { name: 'Enregistrer la correction' }))

    await waitFor(() => expect(api.calls.find((c) => c.method === 'PUT')?.body).toMatchObject({ magasinId: 5 }))
  })

  it('déplace les saisies sélectionnées vers un autre magasin', async () => {
    const user = userEvent.setup()
    const autre = { ...SAISIE, id: 'b2b2b2b2-0000-4000-8000-000000000002' }
    const supprimee = { ...SAISIE, id: 'c3c3c3c3-0000-4000-8000-000000000003', supprime: true }
    const api = fakeApi({
      ...SESSION_OK,
      'GET /api/admin/campagnes': { body: CAMPAGNES_AVEC_MAGASINS },
      'GET /api/admin/magasins': { body: MAGASINS },
      'GET /api/admin/categories': { body: [PATES] },
      'GET /api/admin/saisies?page=1&parPage=50&campagne=2': page([SAISIE, autre, supprimee]),
      'POST /api/admin/saisies/magasin': { body: { nbModifiees: 2 } },
    })
    renderApp('/admin/saisies')

    // Aucune case pour une saisie supprimée ; « tout cocher » ne prend que les autres
    await screen.findByText('3 saisies')
    expect(screen.getAllByRole('checkbox', { name: /^Sélectionner la saisie/ })).toHaveLength(2)
    await user.click(screen.getByRole('checkbox', { name: 'Sélectionner toutes les saisies de la page' }))
    expect(screen.getByText('2 sélectionnées')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Changer de magasin…' }))
    const dialog = screen.getByRole('dialog', { name: 'Changer de magasin' })
    expect(dialog).toHaveTextContent('2 saisies à Lidl')
    expect(within(dialog).getByRole('button', { name: 'Déplacer 2 saisies' })).toBeDisabled()
    await user.selectOptions(within(dialog).getByLabelText('Nouveau magasin'), 'Auchan')
    await user.click(within(dialog).getByRole('button', { name: 'Déplacer 2 saisies' }))

    expect(await screen.findByText('2 saisies déplacées vers Auchan.')).toBeInTheDocument()
    expect(api.calls.find((c) => c.method === 'POST' && c.path.endsWith('/magasin'))?.body).toEqual({
      ids: [SAISIE.id, autre.id],
      magasinId: 5,
    })
    expect(screen.queryByText('2 sélectionnées')).not.toBeInTheDocument()
  })

  it('supprime une saisie après confirmation', async () => {
    const user = userEvent.setup()
    const api = fakeApi({
      ...SESSION_OK,
      'GET /api/admin/campagnes': { body: CAMPAGNES },
      'GET /api/admin/magasins': { body: [] },
      'GET /api/admin/categories': { body: [PATES] },
      'GET /api/admin/saisies?page=1&parPage=50&campagne=2': page([SAISIE]),
      [`DELETE /api/admin/saisies/${SAISIE.id}`]: { status: 204 },
    })
    renderApp('/admin/saisies')

    await user.click(await screen.findByRole('button', { name: 'Supprimer' }))
    const dialog = screen.getByRole('dialog', { name: 'Supprimer la saisie ?' })
    expect(dialog).toHaveTextContent('2 × Pâtes 500 g (Marie, Lidl)')
    await user.click(within(dialog).getByRole('button', { name: 'Supprimer' }))

    await waitFor(() => expect(api.calls.some((c) => c.method === 'DELETE')).toBe(true))
    expect(await screen.findByText('Saisie supprimée.')).toBeInTheDocument()
  })
})
