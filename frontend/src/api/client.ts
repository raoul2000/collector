/**
 * Client HTTP de l'API.
 *
 * - Toutes les URL sont relatives à la racine de l'application (`api/...`).
 * - L'en-tête X-Requested-With est toujours envoyé (protection CSRF côté serveur).
 * - Les erreurs sont converties en ApiError ; une absence de réseau donne le statut 0.
 */

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  /** Messages d'erreur par champ (erreurs de validation 422) */
  readonly fields: Record<string, string>

  constructor(status: number, code: string, message: string, fields: Record<string, string> = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.fields = fields
  }

  get isNetworkError(): boolean {
    return this.status === 0
  }
}

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE'

export interface RequestOptions {
  method?: Method
  body?: unknown
  signal?: AbortSignal
  /** En-têtes supplémentaires (ex. X-Device-Id) */
  headers?: Record<string, string>
}

interface ErrorPayload {
  error?: {
    code?: string
    message?: string
    details?: { fields?: Record<string, string> }
  }
}

export function apiUrl(path: string): string {
  return `${import.meta.env.BASE_URL}api/${path.replace(/^\/+/, '')}`
}

export async function request<T>(
  path: string,
  { method = 'GET', body, signal, headers: extraHeaders }: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {
    ...extraHeaders,
    Accept: 'application/json',
    'X-Requested-With': 'Collector',
  }
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  let response: Response
  try {
    response = await fetch(apiUrl(path), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: 'same-origin',
      signal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error
    }
    throw new ApiError(0, 'network', 'Impossible de joindre le serveur. Vérifiez la connexion.')
  }

  if (response.status === 204) {
    return undefined as T
  }

  const data: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const error = (data as ErrorPayload | null)?.error
    throw new ApiError(
      response.status,
      error?.code ?? 'http_error',
      error?.message ?? `Erreur du serveur (${response.status}).`,
      error?.details?.fields ?? {},
    )
  }

  return data as T
}

export const api = {
  get: <T>(path: string, signal?: AbortSignal) => request<T>(path, { signal }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body }),
  delete: <T = void>(path: string) => request<T>(path, { method: 'DELETE' }),
}
