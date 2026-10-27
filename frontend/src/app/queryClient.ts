import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'
import { ApiError } from '../api/client'
import { ADMIN_SESSION_KEY } from '../features/admin/api'

export function createQueryClient(): QueryClient {
  // Une réponse 401 sur une requête de l'espace responsable signifie que la session a expiré :
  // la session est effacée du cache, ce qui renvoie vers l'écran de connexion (cf. AdminLayout).
  const onError = (error: Error) => {
    if (error instanceof ApiError && error.status === 401) {
      client.setQueryData(ADMIN_SESSION_KEY, null)
    }
  }

  const client = new QueryClient({
    queryCache: new QueryCache({ onError }),
    mutationCache: new MutationCache({ onError }),
    defaultOptions: {
      queries: {
        staleTime: 10_000,
        // Inutile de réessayer une erreur « client » (401, 404, 422…) : seules les erreurs réseau/serveur le sont
        retry: (failureCount, error) =>
          !(error instanceof ApiError && error.status >= 400 && error.status < 500) && failureCount < 2,
      },
      mutations: {
        retry: false,
      },
    },
  })

  return client
}
