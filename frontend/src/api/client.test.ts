import { afterEach, describe, expect, it, vi } from 'vitest'
import { api, ApiError, apiUrl } from './client'

function mockFetch(response: Response | Error) {
  const fn = vi.fn((_input: RequestInfo | URL, _init?: RequestInit) =>
    response instanceof Error ? Promise.reject(response) : Promise.resolve(response),
  )
  vi.stubGlobal('fetch', fn)
  return fn
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('apiUrl', () => {
  it('préfixe les chemins par la racine de l’application', () => {
    expect(apiUrl('referentiel')).toBe('/api/referentiel')
    expect(apiUrl('/admin/magasins')).toBe('/api/admin/magasins')
  })
})

describe('client API', () => {
  it('envoie un GET avec l’en-tête anti-CSRF et renvoie le JSON', async () => {
    const fetch = mockFetch(json(200, { prenom: 'Sophie' }))

    await expect(api.get('admin/session')).resolves.toEqual({ prenom: 'Sophie' })

    expect(fetch).toHaveBeenCalledWith('/api/admin/session', expect.objectContaining({ method: 'GET', body: undefined }))
    const init = fetch.mock.calls[0]![1]!
    expect(init.headers).toMatchObject({ 'X-Requested-With': 'Collector' })
    expect(init.headers).not.toHaveProperty('Content-Type')
  })

  it('sérialise le corps des requêtes en JSON', async () => {
    const fetch = mockFetch(json(201, { id: 1 }))

    await api.post('admin/magasins', { nom: 'Lidl' })

    const init = fetch.mock.calls[0]![1]!
    expect(init.method).toBe('POST')
    expect(init.body).toBe('{"nom":"Lidl"}')
    expect(init.headers).toMatchObject({ 'Content-Type': 'application/json' })
  })

  it('renvoie undefined pour une réponse 204', async () => {
    mockFetch(new Response(null, { status: 204 }))

    await expect(api.delete('admin/magasins/1')).resolves.toBeUndefined()
  })

  it('convertit les erreurs de l’API en ApiError avec les erreurs par champ', async () => {
    mockFetch(
      json(422, {
        error: { code: 'validation_error', message: 'Données invalides.', details: { fields: { nom: 'Obligatoire.' } } },
      }),
    )

    const error = await api.post('admin/magasins', {}).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 422, code: 'validation_error', message: 'Données invalides.', fields: { nom: 'Obligatoire.' } })
  })

  it('gère une réponse d’erreur qui n’est pas du JSON', async () => {
    mockFetch(new Response('<html>Erreur</html>', { status: 502 }))

    await expect(api.get('referentiel')).rejects.toMatchObject({ status: 502, code: 'http_error' })
  })

  it('signale une absence de réseau avec le statut 0', async () => {
    mockFetch(new TypeError('Failed to fetch'))

    const error = await api.get('referentiel').catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).isNetworkError).toBe(true)
  })
})
