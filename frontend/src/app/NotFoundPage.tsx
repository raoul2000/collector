import { Link } from 'react-router'
import styles from './NotFoundPage.module.css'

export function NotFoundPage() {
  return (
    <main className={styles.page}>
      <h1>Page introuvable</h1>
      <p>Cette adresse ne correspond à aucune page de l'application.</p>
      <Link to="/">Retour à l'accueil</Link>
    </main>
  )
}
