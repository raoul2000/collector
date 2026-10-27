import { useNbAEnvoyer } from '../../db/saisies'
import { cx } from '../../lib/cx'
import { synchroniser } from '../../sync/engine'
import { useSyncStore } from '../../sync/syncStore'
import styles from './SyncIndicator.module.css'

/**
 * État de la synchronisation, toujours visible dans l'en-tête. Un appui relance la synchronisation.
 */
export function SyncIndicator() {
  const { enCours, enLigne, erreur } = useSyncStore()
  const nbAEnvoyer = useNbAEnvoyer() ?? 0

  let etat: 'encours' | 'horsligne' | 'erreur' | 'attente' | 'ajour'
  let libelle: string
  if (enCours) {
    etat = 'encours'
    libelle = 'Envoi…'
  } else if (!enLigne) {
    etat = 'horsligne'
    libelle = nbAEnvoyer > 0 ? `Hors ligne · ${nbAEnvoyer} en attente` : 'Hors ligne'
  } else if (erreur) {
    etat = 'erreur'
    libelle = 'Erreur d\'envoi'
  } else if (nbAEnvoyer > 0) {
    etat = 'attente'
    libelle = `${nbAEnvoyer} en attente`
  } else {
    etat = 'ajour'
    libelle = 'À jour'
  }

  return (
    <button
      type="button"
      className={cx(styles.indicator, styles[etat])}
      onClick={() => void synchroniser()}
      disabled={enCours}
      title={erreur ?? 'Synchroniser maintenant'}
      aria-live="polite"
      aria-label={`Synchronisation : ${libelle}. Appuyer pour synchroniser.`}
    >
      <span className={styles.dot} aria-hidden="true" />
      {libelle}
    </button>
  )
}
