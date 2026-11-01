import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

/**
 * Identité du bénévole sur ce téléphone, conservée entre deux lancements :
 * identifiant d'appareil (généré une fois), prénom, magasin et thème choisis.
 */
export type Theme = 'standard' | 'sombre'

export interface BenevoleState {
  appareilId: string
  prenom: string | null
  magasinId: number | null
  theme: Theme
  setPrenom: (prenom: string) => void
  setMagasin: (magasinId: number | null) => void
  setTheme: (theme: Theme) => void
}

export const useBenevoleStore = create<BenevoleState>()(
  persist(
    (set) => ({
      appareilId: crypto.randomUUID(),
      prenom: null,
      magasinId: null,
      theme: 'standard',
      setPrenom: (prenom) => set({ prenom: prenom.trim() }),
      setMagasin: (magasinId) => set({ magasinId }),
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'collector-benevole',
      storage: createJSONStorage(() => localStorage),
      partialize: ({ appareilId, prenom, magasinId, theme }) => ({ appareilId, prenom, magasinId, theme }),
    },
  ),
)
