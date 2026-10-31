import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, ApiError } from '../../api/client'
import type {
  AdminSession,
  BilanAdmin,
  Campagne,
  CampagneInput,
  Categorie,
  CategorieInput,
  ChangementMagasin,
  CorrectionSaisie,
  FiltresSaisies,
  ListeAppareils,
  ListeRecherches,
  Magasin,
  MagasinInput,
  PageSaisies,
  SaisieAdmin,
  Section,
} from '../../api/types'

/**
 * Accès à l'API de l'espace responsable (requêtes et mutations TanStack Query).
 */

export const ADMIN_SESSION_KEY = ['admin', 'session'] as const
const CAMPAGNES_KEY = ['admin', 'campagnes'] as const
const MAGASINS_KEY = ['admin', 'magasins'] as const
const SECTIONS_KEY = ['admin', 'sections'] as const
const CATEGORIES_KEY = ['admin', 'categories'] as const
const SAISIES_KEY = ['admin', 'saisies'] as const

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

// --- Sections ------------------------------------------------------------------------------------

export function useSections() {
  return useQuery({
    queryKey: SECTIONS_KEY,
    queryFn: ({ signal }) => api.get<Section[]>('admin/sections', signal),
  })
}

export function useSaveSection() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, nom }: { id?: number; nom: string }) =>
      id === undefined ? api.post<Section>('admin/sections', { nom }) : api.put<Section>(`admin/sections/${id}`, { nom }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SECTIONS_KEY }),
  })
}

export function useReorderSections() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (ids: number[]) => api.put<Section[]>('admin/sections/ordre', { ids }),
    // L'ordre des catégories suit celui des sections
    onSuccess: (sections) => {
      queryClient.setQueryData(SECTIONS_KEY, sections)
      return queryClient.invalidateQueries({ queryKey: CATEGORIES_KEY })
    },
  })
}

export function useDeleteSection() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`admin/sections/${id}`),
    // Ses catégories passent « sans section »
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: SECTIONS_KEY }),
        queryClient.invalidateQueries({ queryKey: CATEGORIES_KEY }),
      ]),
  })
}

// --- Recherches sans résultat des bénévoles ---------------------------------------------------------

const RECHERCHES_KEY = ['admin', 'recherches'] as const

/** Recherches sans résultat de la campagne active (null : pas de campagne active) */
export function useRecherches() {
  return useQuery({
    queryKey: RECHERCHES_KEY,
    queryFn: async ({ signal }): Promise<ListeRecherches | null> => {
      try {
        return await api.get<ListeRecherches>('admin/recherches', signal)
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          return null
        }
        throw error
      }
    },
    refetchInterval: BILAN_REFRESH_MS,
  })
}

export function useAjouterMotCle() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { terme: string; categorieId: number }) => api.post<Categorie>('admin/recherches/mot-cle', input),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: RECHERCHES_KEY }),
        queryClient.invalidateQueries({ queryKey: CATEGORIES_KEY }),
      ]),
  })
}

export function useIgnorerRecherche() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (terme: string) => api.post('admin/recherches/ignorer', { terme }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: RECHERCHES_KEY }),
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
    // Les saisies affichent le nom et le code de référence de leur catégorie ; les sections, leur nombre de catégories
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: CATEGORIES_KEY }),
        queryClient.invalidateQueries({ queryKey: SAISIES_KEY }),
        queryClient.invalidateQueries({ queryKey: SECTIONS_KEY }),
        // Un mot ajouté aux mots-clés n'est plus une recherche sans résultat
        queryClient.invalidateQueries({ queryKey: RECHERCHES_KEY }),
      ]),
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

// --- Bilans --------------------------------------------------------------------------------------

/** Fréquence d'actualisation des bilans pendant la collecte */
export const BILAN_REFRESH_MS = 30_000

/**
 * Bilan d'une campagne (la campagne active si non précisée), éventuellement limité à un magasin.
 */
export function useBilan(campagne: number | undefined, magasin: number | undefined) {
  const params = new URLSearchParams()
  if (campagne) params.set('campagne', String(campagne))
  if (magasin) params.set('magasin', String(magasin))

  return useQuery({
    queryKey: ['admin', 'bilans', { campagne, magasin }],
    queryFn: ({ signal }) => api.get<BilanAdmin>(`admin/bilans?${params}`, signal),
    refetchInterval: BILAN_REFRESH_MS,
    placeholderData: keepPreviousData,
  })
}

// --- Saisies -------------------------------------------------------------------------------------

export const PAR_PAGE = 50

export function useAdminSaisies(filtres: FiltresSaisies, enabled = true) {
  const params = new URLSearchParams({ page: String(filtres.page), parPage: String(PAR_PAGE) })
  if (filtres.campagne) params.set('campagne', String(filtres.campagne))
  if (filtres.magasin) params.set('magasin', String(filtres.magasin))
  if (filtres.categorie) params.set('categorie', String(filtres.categorie))
  if (filtres.appareil) params.set('appareil', filtres.appareil)
  if (filtres.prenom) params.set('prenom', filtres.prenom)
  if (filtres.sansCode) params.set('sansCode', '1')
  else if (filtres.code) params.set('code', filtres.code)
  if (filtres.supprimees) params.set('supprimees', '1')

  return useQuery({
    queryKey: [...SAISIES_KEY, filtres],
    queryFn: ({ signal }) => api.get<PageSaisies>(`admin/saisies?${params}`, signal),
    // Garde l'affichage précédent pendant le chargement d'une autre page ou d'un autre filtre
    placeholderData: keepPreviousData,
    enabled,
  })
}

export function useCorrigerSaisie() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, correction }: { id: string; correction: CorrectionSaisie }) =>
      api.put<SaisieAdmin>(`admin/saisies/${id}`, correction),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SAISIES_KEY }),
  })
}

// --- Appareils ----------------------------------------------------------------------------------

/** Liste des appareils d'une campagne (la campagne active par défaut), actualisée comme les bilans */
export function useAppareils(campagne: number | undefined) {
  return useQuery({
    queryKey: ['admin', 'appareils', { campagne }],
    queryFn: ({ signal }) => api.get<ListeAppareils>(`admin/appareils${campagne ? `?campagne=${campagne}` : ''}`, signal),
    refetchInterval: BILAN_REFRESH_MS,
    placeholderData: keepPreviousData,
  })
}

export function useChangerMagasin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (changement: ChangementMagasin) => api.post<{ nbModifiees: number }>('admin/saisies/magasin', changement),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SAISIES_KEY }),
  })
}

export function useSupprimerSaisie() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`admin/saisies/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SAISIES_KEY }),
  })
}

export function useDeleteCategorie() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`admin/categories/${id}`),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: CATEGORIES_KEY }),
        queryClient.invalidateQueries({ queryKey: SECTIONS_KEY }),
      ]),
  })
}
