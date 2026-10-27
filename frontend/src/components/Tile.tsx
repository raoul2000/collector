import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cx } from '../lib/cx'
import styles from './Tile.module.css'

export interface TileProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Texte secondaire, sous le libellé */
  detail?: ReactNode
  selected?: boolean
  size?: 'md' | 'lg'
}

/**
 * Grande case cliquable (catégorie, format…), pensée pour une utilisation au pouce.
 */
export function Tile({ detail, selected, size = 'md', className, children, type = 'button', ...rest }: TileProps) {
  return (
    <button
      type={type}
      className={cx(styles.tile, styles[size], selected && styles.selected, className)}
      aria-pressed={selected}
      {...rest}
    >
      <span className={styles.label}>{children}</span>
      {detail && <span className={styles.detail}>{detail}</span>}
    </button>
  )
}
