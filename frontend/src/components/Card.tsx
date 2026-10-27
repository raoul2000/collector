import type { ReactNode } from 'react'
import { cx } from '../lib/cx'
import styles from './Card.module.css'

export interface CardProps {
  title?: string
  /** Éléments affichés à droite du titre (boutons…) */
  actions?: ReactNode
  className?: string
  children: ReactNode
}

export function Card({ title, actions, className, children }: CardProps) {
  return (
    <section className={cx(styles.card, className)}>
      {(title || actions) && (
        <header className={styles.header}>
          {title && <h2 className={styles.title}>{title}</h2>}
          {actions && <div className={styles.actions}>{actions}</div>}
        </header>
      )}
      {children}
    </section>
  )
}
