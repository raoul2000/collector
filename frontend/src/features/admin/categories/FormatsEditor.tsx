import { useId, useState } from 'react'
import { Button } from '../../../components/Button'
import { CONTENANCE_MAX, parseContenance, UNITES_SAISIE } from '../../../lib/contenance'
import { formatContenance } from '../../../lib/format'
import styles from './FormatsEditor.module.css'

export const MAX_FORMATS = 8

export interface FormatsEditorProps {
  unite: 'kg' | 'L'
  /** Contenances en g ou ml */
  value: number[]
  onChange: (formats: number[]) => void
  error?: string
}

/**
 * Édition des formats prédéfinis d'une catégorie : contenances proposées en raccourci lors de la saisie.
 */
export function FormatsEditor({ unite, value, onChange, error }: FormatsEditorProps) {
  const id = useId()
  const unites = UNITES_SAISIE[unite]
  const [texte, setTexte] = useState('')
  const [symbole, setSymbole] = useState<string>(unites[0].symbole)
  const [localError, setLocalError] = useState<string | null>(null)

  const add = () => {
    const facteur = unites.find((u) => u.symbole === symbole)?.facteur ?? 1
    const contenance = parseContenance(texte, facteur)
    if (contenance === null) {
      setLocalError('Saisissez une contenance valide.')
      return
    }
    if (contenance > CONTENANCE_MAX[unite]) {
      setLocalError(`La contenance ne doit pas dépasser ${formatContenance(CONTENANCE_MAX[unite], unite)}.`)
      return
    }
    if (value.includes(contenance)) {
      setLocalError('Ce format existe déjà.')
      return
    }
    setLocalError(null)
    setTexte('')
    onChange([...value, contenance].sort((a, b) => a - b))
  }

  const message = localError ?? error

  return (
    <fieldset className={styles.fieldset}>
      <legend>Formats proposés à la saisie</legend>

      {value.length === 0 ? (
        <p className={styles.empty}>Aucun format : le bénévole saisira la contenance lui-même.</p>
      ) : (
        <ul className={styles.chips}>
          {value.map((contenance) => (
            <li key={contenance} className={styles.chip}>
              {formatContenance(contenance, unite)}
              <button
                type="button"
                className={styles.remove}
                onClick={() => onChange(value.filter((c) => c !== contenance))}
                aria-label={`Retirer le format ${formatContenance(contenance, unite)}`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      {value.length < MAX_FORMATS && (
        <div className={styles.add}>
          <label htmlFor={`${id}-valeur`} className="visually-hidden">
            Contenance à ajouter
          </label>
          <input
            id={`${id}-valeur`}
            className={styles.input}
            inputMode="decimal"
            placeholder="ex. 500"
            value={texte}
            onChange={(e) => setTexte(e.target.value)}
            onKeyDown={(e) => {
              // Entrée ajoute le format au lieu d'envoyer le formulaire
              if (e.key === 'Enter') {
                e.preventDefault()
                add()
              }
            }}
            aria-invalid={message ? true : undefined}
            aria-describedby={message ? `${id}-erreur` : undefined}
          />
          <label htmlFor={`${id}-unite`} className="visually-hidden">
            Unité
          </label>
          <select id={`${id}-unite`} className={styles.select} value={symbole} onChange={(e) => setSymbole(e.target.value)}>
            {unites.map((u) => (
              <option key={u.symbole} value={u.symbole}>
                {u.symbole}
              </option>
            ))}
          </select>
          <Button variant="secondary" onClick={add}>
            Ajouter
          </Button>
        </div>
      )}

      {message && (
        <p id={`${id}-erreur`} className={styles.error}>
          {message}
        </p>
      )}
    </fieldset>
  )
}
