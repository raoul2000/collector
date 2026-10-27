import { NavLink, Outlet } from 'react-router'
import { cx } from '../../lib/cx'
import styles from './AdminLayout.module.css'

const NAVIGATION = [
  { to: 'campagnes', label: 'Campagnes' },
  { to: 'magasins', label: 'Magasins' },
  { to: 'categories', label: 'Catégories' },
]

/**
 * Mise en page de l'espace responsable : bandeau, navigation et contenu.
 */
export function AdminLayout() {
  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <span className={styles.brand}>
            Collector <span className={styles.brandSub}>Administration</span>
          </span>
        </div>
        <nav className={styles.nav} aria-label="Navigation principale">
          {NAVIGATION.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => cx(styles.navLink, isActive && styles.active)}>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  )
}
