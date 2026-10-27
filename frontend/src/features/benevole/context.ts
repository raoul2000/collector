import { useOutletContext } from 'react-router'
import type { MagasinRef, Referentiel } from '../../api/types'

/**
 * Données communes aux écrans bénévoles, fournies par BenevoleLayout une fois le bénévole identifié.
 */
export interface BenevoleContext {
  referentiel: Referentiel
  magasin: MagasinRef
  prenom: string
}

export function useBenevole(): BenevoleContext {
  return useOutletContext<BenevoleContext>()
}
