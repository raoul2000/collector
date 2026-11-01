import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ReceptionAida } from '../../../api/types'
import { formatNombre } from '../../../lib/format'
import { fakeApi, SESSION_OK } from '../../../test/fakeApi'
import { renderApp } from '../../../test/renderApp'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

const RECEPTION: ReceptionAida = {
  campagne: { id: 2, nom: 'Collecte 2026', dateDebut: '2026-11-27', dateFin: '2026-11-28' },
  magasinId: null,
  articles: [
    { code: '2000000007397', libelles: ['Pâtes 500 g'], nbArticles: 1200, aVerifier: 5 },
    { code: '2000000008004', libelles: ['Eau 50 cl', 'Eau 1,5 L'], nbArticles: 30, aVerifier: 0 },
  ],
  nonRapprochees: [{ categorieId: 9, nom: 'Autre', nbArticles: 6, nbSaisies: 2 }],
  totaux: { nbArticles: 1236, aVerifier: 5, nonRapproches: 6 },
}

function api(routes: Record<string, unknown> = {}) {
  return fakeApi({
    ...SESSION_OK,
    'GET /api/admin/campagnes': {
      body: [{ id: 2, nom: 'Collecte 2026', dateDebut: '2026-11-27', dateFin: '2026-11-28', active: true, magasinIds: [4], nbSaisies: 6 }],
    },
    'GET /api/admin/magasins': { body: [{ id: 4, nom: 'Lidl', ville: '', actif: true, nbSaisies: 5 }] },
    'GET /api/admin/bilans/aida?': { body: RECEPTION },
    ...(routes as Record<string, { body: unknown }>),
  })
}

describe('Réception AÏDA', () => {
  it('liste les articles à saisir et les articles non rapprochés', async () => {
    api()
    renderApp('/admin/bilans/aida')

    expect(await screen.findByText('2000000007397')).toBeInTheDocument()
    const [articles, nonRapproches] = screen.getAllByRole('table')
    expect(within(articles!).getAllByRole('row').slice(1).map((l) => l.textContent)).toEqual([
      `2000000007397Pâtes 500 g${formatNombre(1200)}5`,
      '2000000008004Eau 50 cl, Eau 1,5 L30—',
    ])
    expect(within(nonRapproches!).getByText('Autre')).toBeInTheDocument()
    expect(screen.getByText(/à contrôler par rapport à ce qui est reçu/)).toBeInTheDocument()
  })

  it('limite la liste à un magasin', async () => {
    const user = userEvent.setup()
    const calls = api({ 'GET /api/admin/bilans/aida?magasin=4': { body: { ...RECEPTION, magasinId: 4 } } }).calls
    renderApp('/admin/bilans/aida')

    await screen.findByRole('option', { name: 'Lidl' })
    await user.selectOptions(screen.getByLabelText('Magasin'), '4')

    expect(await screen.findByText(/Collecte 2026 · Lidl/)).toBeInTheDocument()
    expect(calls.map((c) => c.path)).toContain('/api/admin/bilans/aida?magasin=4')
  })

  it('imprime la liste', async () => {
    const user = userEvent.setup()
    const print = vi.fn()
    vi.stubGlobal('print', print)
    api()
    renderApp('/admin/bilans/aida')

    await user.click(await screen.findByRole('button', { name: 'Imprimer' }))
    expect(print).toHaveBeenCalledOnce()
  })

  it('est accessible depuis les bilans', async () => {
    api({
      'GET /api/admin/bilans?': {
        body: {
          campagne: RECEPTION.campagne,
          magasinId: null,
          totaux: { nbSaisies: 0, nbArticles: 0, grammes: 0, millilitres: 0, sansContenance: 0 },
          categories: [],
          heures: [],
          magasins: [],
        },
      },
    })
    renderApp('/admin/bilans')

    expect(await screen.findByRole('link', { name: 'Réception AÏDA' })).toHaveAttribute('href', '/admin/bilans/aida')
  })
})
