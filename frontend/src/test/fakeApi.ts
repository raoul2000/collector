import { vi } from 'vitest'

export interface FakeResponse {
  status?: number
  body?: unknown
}

/** Réponse fixe, ou fonction recevant le corps JSON de la requête */
export type FakeRoute = FakeResponse | ((body: unknown) => FakeResponse)

export interface FakeCall {
  method: string
  path: string
  body: unknown
}

/**
 * Remplace fetch par un faux serveur d'API.
 *
 *   const api = fakeApi({
 *     'GET /api/admin/session': { body: { prenom: 'Sophie' } },
 *     'POST /api/admin/magasins': (body) => ({ status: 201, body: { id: 1, ...body } }),
 *   })
 *   expect(api.calls).toContainEqual(...)
 *
 * Une route non déclarée répond 404.
 */
export function fakeApi(routes: Record<string, FakeRoute>) {
  const calls: FakeCall[] = []

  const fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const method = init?.method ?? 'GET'
    const path = String(input)
    const body: unknown = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined
    calls.push({ method, path, body })

    const route = routes[`${method} ${path}`]
    const response = typeof route === 'function' ? route(body) : (route ?? { status: 404, body: { error: { code: 'not_found', message: 'Route introuvable.' } } })
    const status = response.status ?? 200

    return status === 204
      ? new Response(null, { status })
      : new Response(JSON.stringify(response.body ?? null), { status, headers: { 'Content-Type': 'application/json' } })
  })

  vi.stubGlobal('fetch', fetch)

  return {
    calls,
    /** Ajoute ou remplace une route en cours de test */
    set(key: string, route: FakeRoute) {
      routes[key] = route
    },
  }
}

export const SESSION_OK: Record<string, FakeRoute> = {
  'GET /api/admin/session': { body: { prenom: 'Sophie' } },
}
