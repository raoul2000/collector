import { useId, useState } from 'react'
import styles from './QuantityStepper.module.css'

export interface QuantityStepperProps {
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
}

/**
 * Sélecteur de quantité à gros boutons [−] / [+], la valeur restant modifiable au clavier.
 */
export function QuantityStepper({ label, value, onChange, min = 1, max = 999 }: QuantityStepperProps) {
  const id = useId()
  const borner = (n: number) => Math.min(max, Math.max(min, n))

  // Texte affiché : peut être vide pendant la frappe, sans forcer aussitôt la valeur minimale
  const [texte, setTexte] = useState(String(value))
  const [valeurAffichee, setValeurAffichee] = useState(value)
  if (value !== valeurAffichee) {
    // Valeur changée par les boutons ou par le parent
    setValeurAffichee(value)
    setTexte(String(value))
  }

  return (
    <div className={styles.stepper}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <div className={styles.controls}>
        <button
          type="button"
          className={styles.button}
          onClick={() => onChange(borner(value - 1))}
          disabled={value <= min}
          aria-label="Diminuer la quantité"
        >
          −
        </button>
        <input
          id={id}
          className={styles.input}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={texte}
          onChange={(e) => {
            const chiffres = e.target.value.replace(/\D/g, '').slice(0, String(max).length)
            setTexte(chiffres)
            if (chiffres !== '') {
              const nouvelle = borner(Number(chiffres))
              setValeurAffichee(nouvelle)
              onChange(nouvelle)
            }
          }}
          onBlur={() => setTexte(String(value))}
          onFocus={(e) => e.target.select()}
        />
        <button
          type="button"
          className={styles.button}
          onClick={() => onChange(borner(value + 1))}
          disabled={value >= max}
          aria-label="Augmenter la quantité"
        >
          +
        </button>
      </div>
    </div>
  )
}
