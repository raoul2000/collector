import { create } from 'zustand'

/**
 * État de la synchronisation, affiché par l'indicateur de l'en-tête.
 */
export interface SyncState {
  /** Une synchronisation est en cours */
  enCours: boolean
  /** Le serveur est joignable (dernier échange réussi et navigateur connecté) */
  enLigne: boolean
  /** Date de la dernière synchronisation réussie (ISO) */
  derniereSynchro: string | null
  /** Message de la dernière erreur (autre qu'une absence de réseau) */
  erreur: string | null
}

export const useSyncStore = create<SyncState>(() => ({
  enCours: false,
  enLigne: typeof navigator === 'undefined' ? true : navigator.onLine,
  derniereSynchro: null,
  erreur: null,
}))
