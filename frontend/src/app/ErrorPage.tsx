import { isRouteErrorResponse, Link, useRouteError } from 'react-router'
import { Button } from '../components/Button'
import styles from './NotFoundPage.module.css'

/**
 * Erreur inattendue pendant l'affichage d'un écran. Les saisies sont en sécurité sur le téléphone :
 * on propose simplement de recharger l'application.
 */
export function ErrorPage() {
  const error = useRouteError()
  const detail = isRouteErrorResponse(error) ? `${error.status} ${error.statusText}` : error instanceof Error ? error.message : null

  return (
    <main className={styles.page}>
      <h1>Une erreur est survenue</h1>
      <p>Vos saisies sont conservées sur le téléphone. Rechargez l'application pour continuer.</p>
      <Button size="lg" onClick={() => window.location.reload()}>
        Recharger
      </Button>
      <Link to="/">Retour à l'accueil</Link>
      {import.meta.env.DEV && detail && <pre className={styles.detail}>{detail}</pre>}
    </main>
  )
}
