import type { MagasinRef } from '../../api/types'
import { cx } from '../../lib/cx'
import styles from './MagasinPicker.module.css'

export interface MagasinPickerProps {
  magasins: MagasinRef[]
  value: number | null
  onChange: (magasinId: number) => void
  /** Libellé du groupe, lu par les lecteurs d'écran */
  label: string
}

/**
 * Choix du magasin sous forme de grandes cases, faciles à toucher.
 */
export function MagasinPicker({ magasins, value, onChange, label }: MagasinPickerProps) {
  return (
    <div className={styles.list} role="radiogroup" aria-label={label}>
      {magasins.map((magasin) => (
        <button
          key={magasin.id}
          type="button"
          role="radio"
          aria-checked={value === magasin.id}
          className={cx(styles.option, value === magasin.id && styles.selected)}
          onClick={() => onChange(magasin.id)}
        >
          <span className={styles.nom}>{magasin.nom}</span>
          {magasin.ville && <span className={styles.ville}>{magasin.ville}</span>}
        </button>
      ))}
    </div>
  )
}
