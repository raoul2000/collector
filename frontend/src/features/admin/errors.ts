import { ApiError } from '../../api/client'
import { toast } from '../../components/toast'

export type FieldErrors = Record<string, string>

/**
 * Traite l'échec d'une mutation de l'administration :
 * - erreurs de validation (422) : transmises au formulaire, champ par champ ;
 * - session expirée (401) : rien à faire, la redirection vers la connexion est automatique ;
 * - autres erreurs : message à l'écran.
 */
export function handleMutationError(error: unknown, setFieldErrors?: (errors: FieldErrors) => void): void {
  if (error instanceof ApiError) {
    if (error.status === 422 && setFieldErrors && Object.keys(error.fields).length > 0) {
      setFieldErrors(error.fields)
      return
    }
    if (error.status === 401) {
      return
    }
  }
  toast.error(error instanceof Error ? error.message : 'Une erreur inattendue est survenue.')
}
