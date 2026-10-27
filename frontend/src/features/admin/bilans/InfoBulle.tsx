import styles from './bilans.module.css'

export interface InfoBulleProps {
  /** Valeur mise en avant */
  valeur: string
  libelle: string
  details?: string[]
}

/**
 * Infobulle des graphiques : la valeur d'abord, puis ce qu'elle désigne.
 */
export function InfoBulle({ valeur, libelle, details }: InfoBulleProps) {
  return (
    <div className={styles.infobulle}>
      <strong className={styles.infobulleValeur}>{valeur}</strong>
      <span className={styles.infobulleLibelle}>{libelle}</span>
      {details?.map((detail) => (
        <span key={detail} className={styles.infobulleDetail}>
          {detail}
        </span>
      ))}
    </div>
  )
}
