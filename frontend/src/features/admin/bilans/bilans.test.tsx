import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { BilanAdmin, BilanCategorie, Campagne } from '../../../api/types'
import { fakeApi, SESSION_OK } from '../../../test/fakeApi'
import { renderApp } from '../../../test/renderApp'
import { colonnesParJour, mentionSansContenance, totalContenance } from '../../../lib/bilans'

afterEach(() => {
  vi.unstubAllGlobals()
})

const CAMPAGNES: Campagne[] = [
  { id: 2, nom: 'Collecte 2026', dateDebut: '2026-11-27', dateFin: '2026-11-28', active: true, magasinIds: [4, 5], nbSaisies: 6 },
]

const PATES: BilanCategorie = { categorieId: 1, nom: 'Pâtes', unite: 'kg', nbSaisies: 3, nbArticles: 6, contenance: 4000, sansContenance: 1 }
const HUILE: BilanCategorie = { categorieId: 2, nom: 'Huile', unite: 'L', nbSaisies: 2, nbArticles: 3, contenance: 2500, sansContenance: 0 }
const SAVON: BilanCategorie = { categorieId: 3, nom: 'Savon', unite: 'unite', nbSaisies: 1, nbArticles: 4, contenance: null, sansContenance: 0 }

const BILAN: BilanAdmin = {
  campagne: { id: 2, nom: 'Collecte 2026', dateDebut: '2026-11-27', dateFin: '2026-11-28' },
  magasinId: null,
  totaux: { nbSaisies: 6, nbArticles: 1300, grammes: 1234500, millilitres: 2500, sansContenance: 1 },
  categories: [PATES, HUILE, SAVON],
  heures: [
    { jour: '2026-11-27', heure: 10, nbSaisies: 3, nbArticles: 6, grammes: 4000, millilitres: 500 },
    { jour: '2026-11-28', heure: 9, nbSaisies: 1, nbArticles: 4, grammes: 0, millilitres: 0 },
  ],
  magasins: [
    { magasinId: 4, nom: 'Lidl', ville: '', nbSaisies: 5, nbArticles: 12, grammes: 4000, millilitres: 2000, sansContenance: 1 },
    { magasinId: 5, nom: 'Auchan', ville: 'Nord', nbSaisies: 1, nbArticles: 1, grammes: 0, millilitres: 500, sansContenance: 0 },
  ],
}

function api(routes: Record<string, unknown> = {}) {
  return fakeApi({
    ...SESSION_OK,
    'GET /api/admin/campagnes': { body: CAMPAGNES },
    'GET /api/admin/magasins': {
      body: [
        { id: 4, nom: 'Lidl', ville: '', actif: true, nbSaisies: 5 },
        { id: 5, nom: 'Auchan', ville: 'Nord', actif: true, nbSaisies: 1 },
      ],
    },
    'GET /api/admin/bilans?': { body: BILAN },
    ...(routes as Record<string, { body: unknown }>),
  })
}

describe('Bilans (responsable)', () => {
  it('affiche les chiffres clés et les tableaux de la campagne active', async () => {
    const user = userEvent.setup()
    api()
    renderApp('/admin/bilans')

    // Testing Library normalise l'espace fine insécable des nombres en espace simple
    expect(await screen.findByText('1 300')).toBeInTheDocument()
    expect(screen.getByText('6 saisies')).toBeInTheDocument()
    expect(screen.getByText('1 234,5 kg')).toBeInTheDocument()
    expect(screen.getByText('1 article sans poids ni volume')).toBeInTheDocument()
    expect(screen.getAllByText('Volume')[0]!.nextSibling).toHaveTextContent('2,5 L')
    expect(screen.getByText(/Collecte 2026 · du 27\/11\/2026 au 28\/11\/2026/)).toBeInTheDocument()

    // Tableau par catégorie (vue accessible sans survoler le graphique)
    await user.click(screen.getAllByText('Voir le tableau')[0]!)
    const lignes = within(screen.getAllByRole('table')[0]!).getAllByRole('row').slice(1)
    expect(lignes.map((l) => l.textContent)).toEqual([
      'Pâtes64 kgdont 1 article sans poids3',
      'Huile32,5 L2',
      'Savon4—1',
    ])

    // Par magasin, uniquement pour l'ensemble des magasins
    expect(screen.getByRole('heading', { name: 'Par magasin' })).toBeInTheDocument()
  })

  it('limite le bilan à un magasin', async () => {
    const user = userEvent.setup()
    const calls = api({ 'GET /api/admin/bilans?magasin=5': { body: { ...BILAN, magasinId: 5 } } }).calls
    renderApp('/admin/bilans')

    await screen.findByRole('option', { name: 'Auchan – Nord' })
    await user.selectOptions(screen.getByLabelText('Magasin'), '5')

    expect(await screen.findByText(/· Auchan ·/)).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Par magasin' })).not.toBeInTheDocument()
    expect(calls.map((c) => c.path)).toContain('/api/admin/bilans?magasin=5')
  })

  it('signale l’absence de campagne active', async () => {
    api({ 'GET /api/admin/bilans?': { status: 404, body: { error: { code: 'not_found', message: 'Aucune campagne active.' } } } } as never)
    renderApp('/admin/bilans')

    expect(await screen.findByText(/Aucune campagne n'est active/)).toBeInTheDocument()
  })
})

describe('Données des graphiques', () => {
  it('complète les heures sans saisie pour que tous les jours partagent le même axe', () => {
    expect(colonnesParJour(BILAN.heures)).toEqual([
      {
        jour: '2026-11-27',
        colonnes: [
          { heure: 9, nbArticles: 0, grammes: 0, millilitres: 0 },
          { heure: 10, nbArticles: 6, grammes: 4000, millilitres: 500 },
        ],
      },
      {
        jour: '2026-11-28',
        colonnes: [
          { heure: 9, nbArticles: 4, grammes: 0, millilitres: 0 },
          { heure: 10, nbArticles: 0, grammes: 0, millilitres: 0 },
        ],
      },
    ])
    expect(colonnesParJour([])).toEqual([])
  })

  it('formate le poids ou le volume d’une catégorie', () => {
    expect(totalContenance(PATES)).toBe('4 kg')
    expect(totalContenance(HUILE)).toBe('2,5 L')
    expect(totalContenance(SAVON)).toBeNull()
    expect(mentionSansContenance(PATES)).toBe('dont 1 article sans poids')
    expect(mentionSansContenance({ ...HUILE, sansContenance: 2 })).toBe('dont 2 articles sans volume')
    expect(mentionSansContenance(HUILE)).toBeNull()
  })
})

describe('graduations', () => {
  it('donne des pas ronds couvrant le maximum', async () => {
    const { graduations, majuscule } = await import('../../../lib/bilans')
    expect(graduations(138)).toEqual([0, 50, 100, 150])
    expect(graduations(366)).toEqual([0, 100, 200, 300, 400])
    expect(graduations(235)).toEqual([0, 100, 200, 300])
    expect(graduations(4)).toEqual([0, 1, 2, 3, 4])
    expect(graduations(1)).toEqual([0, 1])
    expect(graduations(0)).toEqual([0, 1])
    expect(majuscule('vendredi 27 novembre')).toBe('Vendredi 27 novembre')
  })
})
