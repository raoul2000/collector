import { useEffect, useId, useRef, type ReactNode } from 'react'
import styles from './Dialog.module.css'

export interface DialogProps {
  open: boolean
  title: string
  /** Appelé quand l'utilisateur ferme la boîte (touche Échap, bouton de fermeture) */
  onClose: () => void
  children: ReactNode
  /** Boutons affichés en bas de la boîte */
  actions?: ReactNode
}

/**
 * Boîte de dialogue modale basée sur l'élément natif <dialog> (gestion du focus et de la touche Échap
 * assurée par le navigateur).
 */
export function Dialog({ open, title, onClose, children, actions }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) {
      return
    }
    if (open && !dialog.open) {
      dialog.showModal()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby={titleId}
      onCancel={(event) => {
        // Échap : on laisse le parent décider de fermer (il pilote la prop open)
        event.preventDefault()
        onClose()
      }}
    >
      {open && (
        <>
          <header className={styles.header}>
            <h2 id={titleId}>{title}</h2>
            <button type="button" className={styles.close} onClick={onClose} aria-label="Fermer">
              ×
            </button>
          </header>
          <div className={styles.body}>{children}</div>
          {actions && <footer className={styles.actions}>{actions}</footer>}
        </>
      )}
    </dialog>
  )
}
