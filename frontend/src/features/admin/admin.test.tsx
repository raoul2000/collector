import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Categorie, Magasin } from '../../api/types'
import { useToastStore } from '../../components/toast'
import { fakeApi, SESSION_OK } from '../../test/fakeApi'
import { renderApp } from '../../test/renderApp'

afterEach(() => {
  vi.unstubAllGlobals()
  useToastStore.setState({ toasts: [] })
})

const NON_CONNECTE = { 'GET /api/admin/session': { status: 401, body: { error: { code: 'unauthorized', message: 'Authentification requise.' } } } }

describe('Accès à l’espace responsable', () => {
  it('redirige vers la connexion sans session', async () => {
    fakeApi(NON_CONNECTE)

    const { router } = renderApp('/admin/magasins')

    expect(await screen.findByRole('heading', { name: 'Espace responsable' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/admin/connexion')
  })

  it('affiche une erreur de mot de passe puis connecte et revient à la page demandée', async () => {
    const user = userEvent.setup()
    const api = fakeApi({
      ...NON_CONNECTE,
      'POST /api/admin/login': (body) =>
        (body as { motDePasse: string }).motDePasse === 'secret'
          ? { body: { prenom: 'Sophie' } }
          : { status: 401, body: { error: { code: 'invalid_credentials', message: 'Mot de passe incorrect.' } } },
      'GET /api/admin/magasins': { body: [] },
    })
    const { router } = renderApp('/admin/magasins')

    await user.type(await screen.findByLabelText('Prénom'), 'Sophie')
    await user.type(screen.getByLabelText('Mot de passe'), 'faux')
    await user.click(screen.getByRole('button', { name: 'Se connecter' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Mot de passe incorrect.')
    expect(screen.getByLabelText('Mot de passe')).toHaveValue('')

    await user.type(screen.getByLabelText('Mot de passe'), 'secret')
    await user.click(screen.getByRole('button', { name: 'Se connecter' }))

    expect(await screen.findByRole('heading', { name: 'Magasins' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/admin/magasins')
    expect(screen.getByText('Sophie')).toBeInTheDocument()
    expect(api.calls.find((c) => c.method === 'POST')?.body).toEqual({ prenom: 'Sophie', motDePasse: 'faux' })
  })

  it('revient à la connexion quand la session expire', async () => {
    fakeApi({
      ...SESSION_OK,
      'GET /api/admin/magasins': { status: 401, body: { error: { code: 'unauthorized', message: 'Authentification requise.' } } },
    })

    const { router } = renderApp('/admin/magasins')

    await waitFor(() => expect(router.state.location.pathname).toBe('/admin/connexion'))
  })

  it('déconnecte le responsable', async () => {
    const user = userEvent.setup()
    const api = fakeApi({ ...SESSION_OK, 'GET /api/admin/campagnes': { body: [] }, 'POST /api/admin/logout': { status: 204 } })
    const { router } = renderApp('/admin/campagnes')

    await user.click(await screen.findByRole('button', { name: 'Déconnexion' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/admin/connexion'))
    expect(api.calls).toContainEqual(expect.objectContaining({ method: 'POST', path: '/api/admin/logout' }))
  })
})

describe('Magasins', () => {
  const lidl: Magasin = { id: 1, nom: 'Lidl', ville: 'Nord', actif: true, nbSaisies: 0 }
  const auchan: Magasin = { id: 2, nom: 'Auchan', ville: '', actif: false, nbSaisies: 12 }

  it('liste les magasins et empêche de supprimer ceux qui ont des saisies', async () => {
    fakeApi({ ...SESSION_OK, 'GET /api/admin/magasins': { body: [auchan, lidl] } })

    renderApp('/admin/magasins')

    const rows = await screen.findAllByRole('row')
    expect(rows).toHaveLength(3)
    expect(within(rows[1]!).getByText('Désactivé')).toBeInTheDocument()
    expect(within(rows[1]!).getByRole('button', { name: 'Supprimer' })).toBeDisabled()
    expect(within(rows[2]!).getByRole('button', { name: 'Supprimer' })).toBeEnabled()
  })

  it('crée un magasin et affiche les erreurs de validation du serveur', async () => {
    const user = userEvent.setup()
    let refuse = true
    const api = fakeApi({
      ...SESSION_OK,
      'GET /api/admin/magasins': { body: [] },
      'POST /api/admin/magasins': (body) =>
        refuse
          ? { status: 422, body: { error: { code: 'validation_error', message: 'Données invalides.', details: { fields: { nom: 'Ce magasin existe déjà.' } } } } }
          : { status: 201, body: { id: 3, ...(body as object), nbSaisies: 0 } },
    })
    renderApp('/admin/magasins')

    await user.click(await screen.findByRole('button', { name: 'Nouveau magasin' }))
    const dialog = screen.getByRole('dialog', { name: 'Nouveau magasin' })
    await user.type(within(dialog).getByLabelText('Nom du magasin'), 'Lidl')
    await user.type(within(dialog).getByLabelText('Ville ou quartier'), 'Sud')
    await user.click(within(dialog).getByRole('button', { name: 'Enregistrer' }))

    expect(await within(dialog).findByText('Ce magasin existe déjà.')).toBeInTheDocument()

    refuse = false
    await user.click(within(dialog).getByRole('button', { name: 'Enregistrer' }))

    expect(await screen.findByText('Magasin « Lidl » enregistré.')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(api.calls.filter((c) => c.method === 'POST').at(-1)?.body).toEqual({ nom: 'Lidl', ville: 'Sud', actif: true })
  })
})

describe('Catégories', () => {
  const categorie = (id: number, nom: string, extra: Partial<Categorie> = {}): Categorie => ({
    id,
    nom,
    unite: 'kg',
    ordre: id * 10,
    active: true,
    codeReference: null,
    formats: [],
    nbSaisies: 0,
    ...extra,
  })

  it('affiche les formats et réordonne les catégories', async () => {
    const user = userEvent.setup()
    const liste = [categorie(1, 'Pâtes', { formats: [500, 1000] }), categorie(2, 'Huile', { unite: 'L', formats: [1000] }), categorie(3, 'Savon', { unite: 'unite' })]
    const api = fakeApi({
      ...SESSION_OK,
      'GET /api/admin/categories': { body: liste },
      'PUT /api/admin/categories/ordre': (body) => ({
        body: (body as { ids: number[] }).ids.map((id) => liste.find((c) => c.id === id)),
      }),
    })
    renderApp('/admin/categories')

    expect(await screen.findByText('500 g · 1 kg')).toBeInTheDocument()
    expect(screen.getByText('1 L')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Monter « Pâtes »' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Monter « Huile »' }))

    expect(api.calls.find((c) => c.method === 'PUT')?.body).toEqual({ ids: [2, 1, 3] })
    await waitFor(() => {
      const noms = screen.getAllByRole('row').slice(1).map((row) => within(row).getAllByRole('cell')[1]!.textContent)
      expect(noms).toEqual(['Huile', 'Pâtes', 'Savon'])
    })
  })

  it('crée une catégorie avec des formats saisis en kg', async () => {
    const user = userEvent.setup()
    const api = fakeApi({
      ...SESSION_OK,
      'GET /api/admin/categories': { body: [] },
      'POST /api/admin/categories': (body) => ({ status: 201, body: { ...categorie(9, 'Riz'), ...(body as object) } }),
    })
    renderApp('/admin/categories')

    await user.click(await screen.findByRole('button', { name: 'Nouvelle catégorie' }))
    const dialog = screen.getByRole('dialog', { name: 'Nouvelle catégorie' })
    await user.type(within(dialog).getByLabelText('Nom'), 'Riz')

    const valeur = within(dialog).getByLabelText('Contenance à ajouter')
    await user.type(valeur, '1,5')
    await user.selectOptions(within(dialog).getByLabelText('Unité'), 'kg')
    await user.click(within(dialog).getByRole('button', { name: 'Ajouter' }))
    await user.selectOptions(within(dialog).getByLabelText('Unité'), 'g')
    await user.type(valeur, '500{Enter}')
    await user.type(valeur, '500{Enter}')

    expect(within(dialog).getByText('Ce format existe déjà.')).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Retirer le format 500 g' })).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Enregistrer' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(api.calls.find((c) => c.method === 'POST')?.body).toEqual({
      nom: 'Riz',
      unite: 'kg',
      codeReference: '',
      active: true,
      formats: [500, 1500],
    })
  })

  it('verrouille l’unité d’une catégorie qui a des saisies', async () => {
    const user = userEvent.setup()
    fakeApi({ ...SESSION_OK, 'GET /api/admin/categories': { body: [categorie(1, 'Pâtes', { nbSaisies: 4 })] } })
    renderApp('/admin/categories')

    await user.click(await screen.findByRole('button', { name: 'Modifier' }))

    expect(screen.getByLabelText('Mesure')).toBeDisabled()
    expect(screen.getByText('Non modifiable : des saisies existent.')).toBeInTheDocument()
  })
})
