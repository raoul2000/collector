import type { ReactNode } from 'react'
import { cx } from '../lib/cx'
import styles from './StatTile.module.css'

export interface StatTileProps {
  label: string
  value: ReactNode
  /** Précision sous la valeur (ex. « dont 12 articles sans poids ») */
  detail?: ReactNode
  /** Mise en avant (chiffre principal) */
  hero?: boolean
}

/**
 * Chiffre clé : libellé, valeur, précision éventuelle.
 */
export function StatTile({ label, value, detail, hero = false }: StatTileProps) {
  return (
    <div className={cx(styles.tile, hero && styles.hero)}>
      <span className={styles.label}>{label}</span>
      <span className={styles.value}>{value}</span>
      {detail && <span className={styles.detail}>{detail}</span>}
    </div>
  )
}

export function StatRow({ children }: { children: ReactNode }) {
  return <div className={styles.row}>{children}</div>
}
