import { useEffect } from 'react'
import { NavLink, Outlet } from 'react-router'
import { Alert } from '../../components/Alert'
import { Button } from '../../components/Button'
import { useReferentiel } from '../../db/referentiel'
import { cx } from '../../lib/cx'
import { useBenevoleStore } from '../../stores/benevole'
import { demarrerSynchro, synchroniser } from '../../sync/engine'
import { useSyncStore } from '../../sync/syncStore'
import { Bienvenue } from './Bienvenue'
import styles from './BenevoleLayout.module.css'
import type { BenevoleContext } from './context'
import { SyncIndicator } from './SyncIndicator'

const NAVIGATION = [
  { to: '/', label: 'Saisir', icone: '＋', end: true },
  { to: '/mes-saisies', label: 'Mes saisies', icone: '☰', end: false },
  { to: '/collecte', label: 'Collecte', icone: '★', end: false },
  { to: '/parametres', label: 'Réglages', icone: '⚙', end: false },
]

/**
 * Mise en page de l'espace bénévole (smartphone) : en-tête avec le magasin et l'état de synchronisation,
 * contenu, barre de navigation en bas (à portée de pouce).
 *
 * Tant que le prénom et le magasin ne sont pas connus, affiche l'écran de bienvenue.
 */
export function BenevoleLayout() {
  const referentiel = useReferentiel()
  const prenom = useBenevoleStore((s) => s.prenom)
  const magasinId = useBenevoleStore((s) => s.magasinId)
  const enLigne = useSyncStore((s) => s.enLigne)
  const erreur = useSyncStore((s) => s.erreur)

  useEffect(() => demarrerSynchro(), [])

  const magasin = referentiel?.data.magasins.find((m) => m.id === magasinId)

  let contenu
  if (referentiel === undefined) {
    contenu = null
  } else if (referentiel === null) {
    // Premier lancement : le référentiel n'a encore jamais pu être téléchargé
    contenu = (
      <div className={styles.center}>
        {enLigne && !erreur ? (
          <p>Chargement de la collecte…</p>
        ) : (
          <>
            <Alert kind={enLigne ? 'error' : 'warning'}>
              {enLigne
                ? `Impossible de charger les informations de la collecte. ${erreur}`
                : 'Une connexion Internet est nécessaire au premier lancement.'}
            </Alert>
            <Button variant="secondary" onClick={() => void synchroniser()}>
              Réessayer
            </Button>
          </>
        )}
      </div>
    )
  } else if (!prenom || !magasin) {
    contenu = <Bienvenue magasins={referentiel.data.magasins} />
  } else {
    contenu = <Outlet context={{ referentiel: referentiel.data, magasin, prenom } satisfies BenevoleContext} />
  }

  const identifie = Boolean(referentiel && prenom && magasin)

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <span className={styles.brand}>Collector</span>
          {identifie && magasin && (
            <span className={styles.magasin}>
              {magasin.nom}
              {magasin.ville && ` · ${magasin.ville}`}
            </span>
          )}
        </div>
        <SyncIndicator />
      </header>

      <main className={styles.main}>{contenu}</main>

      {identifie && (
        <nav className={styles.tabbar} aria-label="Navigation" data-onglets>
          {NAVIGATION.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => cx(styles.tab, isActive && styles.active)}>
              <span className={styles.tabIcon} aria-hidden="true">
                {item.icone}
              </span>
              {item.label}
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  )
}
