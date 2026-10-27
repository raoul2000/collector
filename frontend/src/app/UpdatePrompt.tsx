import { useRegisterSW } from 'virtual:pwa-register/react'
import { Button } from '../components/Button'
import styles from './UpdatePrompt.module.css'

/** Fréquence de vérification d'une nouvelle version de l'application */
const UPDATE_CHECK_MS = 60 * 60 * 1000

/**
 * Enregistre le service worker (fonctionnement hors ligne) et propose de recharger l'application
 * lorsqu'une nouvelle version a été publiée.
 */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (registration) {
        setInterval(() => void registration.update(), UPDATE_CHECK_MS)
      }
    },
  })

  if (!needRefresh) {
    return null
  }

  return (
    <div className={styles.banner} role="alert">
      <span>Une nouvelle version de l'application est disponible.</span>
      <div className={styles.actions}>
        <Button size="sm" variant="ghost" className={styles.later} onClick={() => setNeedRefresh(false)}>
          Plus tard
        </Button>
        <Button size="sm" variant="secondary" onClick={() => void updateServiceWorker(true)}>
          Mettre à jour
        </Button>
      </div>
    </div>
  )
}
