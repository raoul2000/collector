import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Categorie, Magasin, Section } from '../../api/types'
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
    sectionId: null,
    unite: 'kg',
    ordre: id * 10,
    active: true,
    codeReference: null,
    motsCles: [],
    formats: [],
    nbSaisies: 0,
    ...extra,
  })

  it('affiche les formats et réordonne les catégories', async () => {
    const user = userEvent.setup()
    const f = (id: number, contenance: number | null, libelle: string | null = null) => ({ id, contenance, libelle })
    const liste = [
      categorie(1, 'Pâtes', { formats: [f(1, 500), f(2, 1000)] }),
      categorie(2, 'Huile', { unite: 'L', formats: [f(3, 1000, 'Olive / colza'), f(4, 1000)] }),
      categorie(3, 'Savon', { unite: 'unite' }),
    ]
    const api = fakeApi({
      ...SESSION_OK,
      'GET /api/admin/sections': { body: [] },
      'GET /api/admin/categories': { body: liste },
      'PUT /api/admin/categories/ordre': (body) => ({
        body: (body as { ids: number[] }).ids.map((id) => liste.find((c) => c.id === id)),
      }),
    })
    renderApp('/admin/categories')

    expect(await screen.findByText('500 g · 1 kg')).toBeInTheDocument()
    expect(screen.getByText('Olive / colza 1 L · 1 L')).toBeInTheDocument()
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
      'GET /api/admin/sections': { body: [] },
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
      sectionId: null,
      unite: 'kg',
      codeReference: '',
      motsCles: '',
      active: true,
      formats: [
        { contenance: 500, libelle: null },
        { contenance: 1500, libelle: null },
      ],
      precisionRequise: false,
    })
  })

  it('groupe les catégories par section et ne les déplace qu’à l’intérieur de leur section', async () => {
    const user = userEvent.setup()
    const sections: Section[] = [
      { id: 1, nom: 'Épicerie', ordre: 10, nbCategories: 2 },
      { id: 2, nom: 'Hygiène', ordre: 20, nbCategories: 1 },
    ]
    const liste = [
      categorie(1, 'Pâtes', { sectionId: 1 }),
      categorie(2, 'Riz', { sectionId: 1 }),
      categorie(3, 'Savon', { sectionId: 2, unite: 'unite' }),
      categorie(4, 'Autre', { unite: 'unite' }),
    ]
    const api = fakeApi({
      ...SESSION_OK,
      'GET /api/admin/sections': { body: sections },
      'GET /api/admin/categories': { body: liste },
      'PUT /api/admin/sections/ordre': { body: [sections[1], sections[0]] },
      'DELETE /api/admin/sections/2': { status: 204 },
    })
    renderApp('/admin/categories')

    const groupes = (await screen.findAllByRole('columnheader')).filter((th) => th.getAttribute('scope') === 'colgroup')
    expect(groupes.map((th) => th.textContent)).toEqual(['Épicerie', 'Hygiène', 'Sans section'])
    expect(screen.getByRole('button', { name: 'Descendre « Riz »' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Monter « Savon »' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Descendre « Pâtes »' })).toBeEnabled()

    await user.click(screen.getByRole('button', { name: 'Monter « Hygiène »' }))
    expect(api.calls.find((c) => c.path === '/api/admin/sections/ordre')?.body).toEqual({ ids: [2, 1] })

    await user.click(screen.getByRole('button', { name: 'Supprimer la section « Hygiène »' }))
    const confirmation = screen.getByRole('dialog', { name: 'Supprimer la section ?' })
    expect(confirmation).toHaveTextContent('Ses 1 catégorie(s) sont conservées, sans section.')
    await user.click(within(confirmation).getByRole('button', { name: 'Supprimer' }))
    await waitFor(() => expect(api.calls.some((c) => c.method === 'DELETE')).toBe(true))
  })

  it('crée une section et y range une catégorie', async () => {
    const user = userEvent.setup()
    const api = fakeApi({
      ...SESSION_OK,
      'GET /api/admin/sections': { body: [{ id: 5, nom: 'Conserves', ordre: 10, nbCategories: 0 }] },
      'GET /api/admin/categories': { body: [] },
      'POST /api/admin/sections': (body) => ({ status: 201, body: { id: 6, ordre: 20, nbCategories: 0, ...(body as object) } }),
      'POST /api/admin/categories': (body) => ({ status: 201, body: { ...categorie(9, 'Poisson'), ...(body as object) } }),
    })
    renderApp('/admin/categories')

    await user.click(await screen.findByRole('button', { name: 'Nouvelle section' }))
    const dialogSection = screen.getByRole('dialog', { name: 'Nouvelle section' })
    await user.type(within(dialogSection).getByLabelText('Nom'), 'Boissons')
    await user.click(within(dialogSection).getByRole('button', { name: 'Enregistrer' }))
    await waitFor(() => expect(api.calls.find((c) => c.path === '/api/admin/sections' && c.method === 'POST')?.body).toEqual({ nom: 'Boissons' }))

    await user.click(screen.getByRole('button', { name: 'Nouvelle catégorie' }))
    const dialog = await screen.findByRole('dialog', { name: 'Nouvelle catégorie' })
    await user.type(within(dialog).getByLabelText('Nom'), 'Poisson')
    await user.selectOptions(within(dialog).getByLabelText('Section'), 'Conserves')
    await user.click(within(dialog).getByRole('button', { name: 'Enregistrer' }))

    await waitFor(() => expect(api.calls.find((c) => c.path === '/api/admin/categories' && c.method === 'POST')?.body).toMatchObject({ nom: 'Poisson', sectionId: 5 }))
  })

  it('ajoute des variantes, avec ou sans contenance selon la mesure', async () => {
    const user = userEvent.setup()
    const huile = categorie(2, 'Huile', { unite: 'L', formats: [{ id: 7, contenance: 1000, libelle: null }] })
    const api = fakeApi({
      ...SESSION_OK,
      'GET /api/admin/sections': { body: [] },
      'GET /api/admin/categories': { body: [huile] },
      'PUT /api/admin/categories/2': (body) => ({ body: { ...huile, ...(body as object) } }),
      'POST /api/admin/categories': (body) => ({ status: 201, body: { ...categorie(9, 'Couches'), ...(body as object) } }),
    })
    renderApp('/admin/categories')

    await user.click(await screen.findByRole('button', { name: 'Modifier' }))
    let dialog = screen.getByRole('dialog', { name: 'Modifier la catégorie' })
    await user.type(within(dialog).getByLabelText('Libellé de la variante (facultatif)'), 'Olive / colza')
    await user.type(within(dialog).getByLabelText('Contenance à ajouter'), '1')
    await user.selectOptions(within(dialog).getByLabelText('Unité'), 'L')
    await user.click(within(dialog).getByRole('button', { name: 'Ajouter' }))
    expect(within(dialog).getByRole('button', { name: 'Retirer le format Olive / colza 1 L' })).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Enregistrer' }))

    await waitFor(() =>
      expect(api.calls.find((c) => c.method === 'PUT')?.body).toMatchObject({
        formats: [
          { id: 7, contenance: 1000, libelle: null },
          { contenance: 1000, libelle: 'Olive / colza' },
        ],
      }),
    )

    await user.click(screen.getByRole('button', { name: 'Nouvelle catégorie' }))
    dialog = await screen.findByRole('dialog', { name: 'Nouvelle catégorie' })
    await user.type(within(dialog).getByLabelText('Nom'), 'Couches')
    await user.selectOptions(within(dialog).getByLabelText('Mesure'), 'unite')
    await user.click(within(dialog).getByRole('button', { name: 'Ajouter' }))
    expect(within(dialog).getByText('Saisissez le libellé de la variante.')).toBeInTheDocument()
    await user.type(within(dialog).getByLabelText('Libellé de la variante'), 'T4{Enter}')
    await user.click(within(dialog).getByRole('button', { name: 'Enregistrer' }))

    await waitFor(() =>
      expect(api.calls.find((c) => c.method === 'POST')?.body).toMatchObject({ unite: 'unite', formats: [{ contenance: null, libelle: 'T4' }] }),
    )
  })

  it('présente les recherches sans résultat, à ajouter aux mots-clés ou à ignorer', async () => {
    const user = userEvent.setup()
    const api = fakeApi({
      ...SESSION_OK,
      'GET /api/admin/sections': { body: [] },
      'GET /api/admin/categories': { body: [categorie(1, 'Pâtes, semoule'), categorie(2, 'Riz')] },
      'GET /api/admin/recherches': {
        body: {
          campagne: { id: 2, nom: 'Collecte 2026' },
          recherches: [
            { terme: 'gnocchi', nombre: 4, derniere: '2026-11-27T10:41:00+01:00', categorie: { id: 1, nom: 'Pâtes, semoule' } },
            { terme: 'boulgour', nombre: 1, derniere: '2026-11-27T09:00:00+01:00', categorie: null },
          ],
        },
      },
      'POST /api/admin/recherches/mot-cle': { body: categorie(1, 'Pâtes, semoule', { motsCles: ['gnocchi'] }) },
      'POST /api/admin/recherches/ignorer': { status: 204 },
    })
    renderApp('/admin/categories')

    const cadre = (await screen.findByRole('heading', { name: 'Recherches sans résultat' })).closest('section')!
    expect(within(cadre).getByText(/Collecte 2026/)).toBeInTheDocument()
    expect(within(cadre).getByLabelText('Catégorie pour « gnocchi »')).toHaveValue('1')
    expect(within(cadre).getByLabelText('Catégorie pour « boulgour »')).toHaveValue('')
    expect(within(cadre).getAllByRole('button', { name: 'Ajouter' })[1]).toBeDisabled()

    await user.click(within(cadre).getAllByRole('button', { name: 'Ajouter' })[0]!)
    await waitFor(() =>
      expect(api.calls.find((c) => c.path === '/api/admin/recherches/mot-cle')?.body).toEqual({ terme: 'gnocchi', categorieId: 1 }),
    )

    await user.click(within(cadre).getByRole('button', { name: 'Ignorer « boulgour »' }))
    await waitFor(() => expect(api.calls.find((c) => c.path === '/api/admin/recherches/ignorer')?.body).toEqual({ terme: 'boulgour' }))
  })

  it('verrouille l’unité d’une catégorie qui a des saisies', async () => {
    const user = userEvent.setup()
    fakeApi({ ...SESSION_OK, 'GET /api/admin/sections': { body: [] },
      'GET /api/admin/categories': { body: [categorie(1, 'Pâtes', { nbSaisies: 4 })] } })
    renderApp('/admin/categories')

    await user.click(await screen.findByRole('button', { name: 'Modifier' }))

    expect(screen.getByLabelText('Mesure')).toBeDisabled()
    expect(screen.getByText('Non modifiable : des saisies existent.')).toBeInTheDocument()
  })
})
