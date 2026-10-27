import { cx } from '../lib/cx'
import { useToastStore } from './toast'
import styles from './Toaster.module.css'

/**
 * Affiche les messages émis avec toast.success / toast.error / toast.info.
 */
export function Toaster() {
  const toasts = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)

  return (
    <div className={styles.region} role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={cx(styles.toast, styles[t.kind])}>
          <span>{t.message}</span>
          <button type="button" className={styles.dismiss} onClick={() => dismiss(t.id)} aria-label="Fermer le message">
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
