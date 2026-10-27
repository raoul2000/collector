import type { ReactNode, TableHTMLAttributes } from 'react'
import { cx } from '../lib/cx'
import styles from './Table.module.css'

/**
 * Tableau stylé, défilant horizontalement sur petit écran. Contenu : <thead> / <tbody> classiques.
 */
export function Table({ className, children, ...rest }: TableHTMLAttributes<HTMLTableElement> & { children: ReactNode }) {
  return (
    <div className={styles.wrapper}>
      <table className={cx(styles.table, className)} {...rest}>
        {children}
      </table>
    </div>
  )
}
