import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

/**
 * Identité du bénévole sur ce téléphone, conservée entre deux lancements :
 * identifiant d'appareil (généré une fois), prénom et magasin choisis.
 */
export interface BenevoleState {
  appareilId: string
  prenom: string | null
  magasinId: number | null
  setPrenom: (prenom: string) => void
  setMagasin: (magasinId: number | null) => void
}

export const useBenevoleStore = create<BenevoleState>()(
  persist(
    (set) => ({
      appareilId: crypto.randomUUID(),
      prenom: null,
      magasinId: null,
      setPrenom: (prenom) => set({ prenom: prenom.trim() }),
      setMagasin: (magasinId) => set({ magasinId }),
    }),
    {
      name: 'collector-benevole',
      storage: createJSONStorage(() => localStorage),
      partialize: ({ appareilId, prenom, magasinId }) => ({ appareilId, prenom, magasinId }),
    },
  ),
)
