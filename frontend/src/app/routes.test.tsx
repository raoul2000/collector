import { screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fakeApi, SESSION_OK } from '../test/fakeApi'
import { renderApp } from '../test/renderApp'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('routes', () => {
  it('affiche l’espace bénévole à la racine', () => {
    renderApp('/')

    expect(screen.getByText('Collector')).toBeInTheDocument()
  })

  it('redirige /admin vers les bilans', async () => {
    fakeApi({
      ...SESSION_OK,
      'GET /api/admin/campagnes': { body: [] },
      'GET /api/admin/magasins': { body: [] },
    })

    const { router } = renderApp('/admin')

    expect(await screen.findByRole('heading', { name: 'Bilans' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/admin/bilans')
    expect(screen.getByRole('link', { name: 'Bilans' })).toHaveAttribute('aria-current', 'page')
  })

  it('affiche une page introuvable pour une adresse inconnue', () => {
    renderApp('/inconnue')

    expect(screen.getByRole('heading', { name: 'Page introuvable' })).toBeInTheDocument()
  })
})
