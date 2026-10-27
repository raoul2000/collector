import type { InputHTMLAttributes } from 'react'
import { cx } from '../lib/cx'
import styles from './Field.module.css'

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string
}

export function Checkbox({ label, className, ...rest }: CheckboxProps) {
  return (
    <label className={cx(styles.checkbox, className)}>
      <input type="checkbox" {...rest} />
      <span>{label}</span>
    </label>
  )
}
