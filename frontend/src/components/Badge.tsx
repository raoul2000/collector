import type { ReactNode } from 'react'
import { cx } from '../lib/cx'
import styles from './Badge.module.css'

export interface BadgeProps {
  kind?: 'neutral' | 'success' | 'warning' | 'danger' | 'info'
  children: ReactNode
}

export function Badge({ kind = 'neutral', children }: BadgeProps) {
  return <span className={cx(styles.badge, styles[kind])}>{children}</span>
}
