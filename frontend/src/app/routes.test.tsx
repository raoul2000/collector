import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import { createQueryClient } from './queryClient'
import { routes } from './routes'

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(
    <QueryClientProvider client={createQueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return router
}

describe('routes', () => {
  it('affiche l’espace bénévole à la racine', () => {
    renderAt('/')

    expect(screen.getByText('Collector')).toBeInTheDocument()
  })

  it('redirige /admin vers la gestion des campagnes', async () => {
    const router = renderAt('/admin')

    expect(await screen.findByRole('heading', { name: 'Campagnes' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/admin/campagnes')
    expect(screen.getByRole('link', { name: 'Campagnes' })).toHaveAttribute('aria-current', 'page')
  })

  it('affiche une page introuvable pour une adresse inconnue', () => {
    renderAt('/inconnue')

    expect(screen.getByRole('heading', { name: 'Page introuvable' })).toBeInTheDocument()
  })
})
