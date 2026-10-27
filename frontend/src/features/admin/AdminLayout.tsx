import { Navigate, NavLink, Outlet, useLocation } from 'react-router'
import { Alert } from '../../components/Alert'
import { Button } from '../../components/Button'
import { cx } from '../../lib/cx'
import { useAdminSession, useLogout } from './api'
import styles from './AdminLayout.module.css'

const NAVIGATION = [
  { to: 'campagnes', label: 'Campagnes' },
  { to: 'magasins', label: 'Magasins' },
  { to: 'categories', label: 'Catégories' },
  { to: 'saisies', label: 'Saisies' },
]

/**
 * Mise en page de l'espace responsable. Sans session valide, redirige vers l'écran de connexion.
 */
export function AdminLayout() {
  const location = useLocation()
  const session = useAdminSession()
  const logout = useLogout()

  if (session.isPending) {
    return <p className={styles.status}>Chargement…</p>
  }
  if (session.isError) {
    return (
      <div className={styles.status}>
        <Alert kind="error">{session.error.message}</Alert>
        <Button variant="secondary" onClick={() => void session.refetch()}>
          Réessayer
        </Button>
      </div>
    )
  }
  if (session.data === null) {
    return <Navigate to="/admin/connexion" replace state={{ from: location.pathname }} />
  }

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <span className={styles.brand}>
            Collector <span className={styles.brandSub}>Administration</span>
          </span>
          <div className={styles.user}>
            <span>{session.data.prenom}</span>
            <button type="button" className={styles.logout} onClick={() => logout.mutate()} disabled={logout.isPending}>
              Déconnexion
            </button>
          </div>
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
