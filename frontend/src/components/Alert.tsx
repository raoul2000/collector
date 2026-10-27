import type { ReactNode } from 'react'
import { cx } from '../lib/cx'
import styles from './Alert.module.css'

export interface AlertProps {
  kind?: 'info' | 'success' | 'warning' | 'error'
  children: ReactNode
  className?: string
}

/**
 * Message affiché dans la page (erreur de chargement, avertissement…).
 */
export function Alert({ kind = 'info', children, className }: AlertProps) {
  return (
    <div className={cx(styles.alert, styles[kind], className)} role={kind === 'error' ? 'alert' : 'status'}>
      {children}
    </div>
  )
}
