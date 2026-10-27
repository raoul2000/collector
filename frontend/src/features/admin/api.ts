import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, ApiError } from '../../api/client'
import type {
  AdminSession,
  Campagne,
  CampagneInput,
  Categorie,
  CategorieInput,
  Magasin,
  MagasinInput,
} from '../../api/types'

/**
 * Accès à l'API de l'espace responsable (requêtes et mutations TanStack Query).
 */

export const ADMIN_SESSION_KEY = ['admin', 'session'] as const
const CAMPAGNES_KEY = ['admin', 'campagnes'] as const
const MAGASINS_KEY = ['admin', 'magasins'] as const
const CATEGORIES_KEY = ['admin', 'categories'] as const

// --- Session -------------------------------------------------------------------------------------

/**
 * Responsable connecté, ou null s'il n'y a pas de session valide.
 */
export function useAdminSession() {
  return useQuery({
    queryKey: ADMIN_SESSION_KEY,
    queryFn: async ({ signal }): Promise<AdminSession | null> => {
      try {
        return await api.get<AdminSession>('admin/session', signal)
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          return null
        }
        throw error
      }
    },
    staleTime: Infinity,
  })
}

export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { prenom: string; motDePasse: string }) => api.post<AdminSession>('admin/login', input),
    onSuccess: (session) => queryClient.setQueryData(ADMIN_SESSION_KEY, session),
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.post<void>('admin/logout'),
    onSettled: () => {
      queryClient.removeQueries({ queryKey: ['admin'] })
      queryClient.setQueryData(ADMIN_SESSION_KEY, null)
    },
  })
}

// --- Campagnes -----------------------------------------------------------------------------------

export function useCampagnes() {
  return useQuery({
    queryKey: CAMPAGNES_KEY,
    queryFn: ({ signal }) => api.get<Campagne[]>('admin/campagnes', signal),
  })
}

export function useSaveCampagne() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id?: number; input: CampagneInput }) =>
      id === undefined ? api.post<Campagne>('admin/campagnes', input) : api.put<Campagne>(`admin/campagnes/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CAMPAGNES_KEY }),
  })
}

export function useSetCampagneActive() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      api.post<Campagne>(`admin/campagnes/${id}/${active ? 'activer' : 'desactiver'}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CAMPAGNES_KEY }),
  })
}

export function useDeleteCampagne() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`admin/campagnes/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CAMPAGNES_KEY }),
  })
}

// --- Magasins ------------------------------------------------------------------------------------

export function useMagasins() {
  return useQuery({
    queryKey: MAGASINS_KEY,
    queryFn: ({ signal }) => api.get<Magasin[]>('admin/magasins', signal),
  })
}

export function useSaveMagasin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id?: number; input: MagasinInput }) =>
      id === undefined ? api.post<Magasin>('admin/magasins', input) : api.put<Magasin>(`admin/magasins/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MAGASINS_KEY }),
  })
}

export function useDeleteMagasin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`admin/magasins/${id}`),
    // Les campagnes affichent leurs magasins rattachés
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin'] }),
  })
}

// --- Catégories ----------------------------------------------------------------------------------

export function useCategories() {
  return useQuery({
    queryKey: CATEGORIES_KEY,
    queryFn: ({ signal }) => api.get<Categorie[]>('admin/categories', signal),
  })
}

export function useSaveCategorie() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id?: number; input: CategorieInput }) =>
      id === undefined
        ? api.post<Categorie>('admin/categories', input)
        : api.put<Categorie>(`admin/categories/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CATEGORIES_KEY }),
  })
}

export function useReorderCategories() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (ids: number[]) => api.put<Categorie[]>('admin/categories/ordre', { ids }),
    onMutate: async (ids) => {
      // Mise à jour immédiate de l'affichage, sans attendre la réponse du serveur
      await queryClient.cancelQueries({ queryKey: CATEGORIES_KEY })
      const previous = queryClient.getQueryData<Categorie[]>(CATEGORIES_KEY)
      if (previous) {
        const byId = new Map(previous.map((c) => [c.id, c]))
        queryClient.setQueryData(
          CATEGORIES_KEY,
          ids.flatMap((id) => byId.get(id) ?? []),
        )
      }
      return { previous }
    },
    onError: (_error, _ids, context) => {
      if (context?.previous) {
        queryClient.setQueryData(CATEGORIES_KEY, context.previous)
      }
    },
    onSuccess: (categories) => queryClient.setQueryData(CATEGORIES_KEY, categories),
  })
}

export function useDeleteCategorie() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`admin/categories/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CATEGORIES_KEY }),
  })
}
