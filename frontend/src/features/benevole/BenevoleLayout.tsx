import { Outlet } from 'react-router'
import styles from './BenevoleLayout.module.css'

/**
 * Mise en page de l'espace bénévole (smartphone) : bandeau fixe et contenu plein écran.
 */
export function BenevoleLayout() {
  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <span className={styles.brand}>Collector</span>
      </header>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  )
}
