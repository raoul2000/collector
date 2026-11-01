import { useId, useState, type KeyboardEvent } from 'react'
import type { FormatInput, Unite } from '../../../api/types'
import { Button } from '../../../components/Button'
import { CONTENANCE_MAX, parseContenance, UNITES_SAISIE } from '../../../lib/contenance'
import { formatContenance } from '../../../lib/format'
import { libelleBouton } from '../../saisie/libelle'
import styles from './FormatsEditor.module.css'

export const MAX_FORMATS = 8

export const LIBELLE_MAX = 40

export interface FormatsEditorProps {
  unite: Unite
  value: FormatInput[]
  onChange: (formats: FormatInput[]) => void
  error?: string
}

/**
 * Édition des boutons proposés à la saisie d'une catégorie : contenances (catégorie au poids ou au volume),
 * avec un libellé de variante facultatif (« Olive / colza » 1 L), ou libellés seuls pour une catégorie à
 * l'unité (« T4 »). Les formats existants gardent leur identifiant : les saisies faites avec restent rattachées.
 */
export function FormatsEditor({ unite, value, onChange, error }: FormatsEditorProps) {
  const id = useId()
  const avecContenance = unite !== 'unite'
  const unites = avecContenance ? UNITES_SAISIE[unite] : []
  const [libelle, setLibelle] = useState('')
  const [texte, setTexte] = useState('')
  const [symbole, setSymbole] = useState<string>(unites[0]?.symbole ?? '')
  const [localError, setLocalError] = useState<string | null>(null)

  const add = () => {
    const nom = libelle.trim()
    let contenance: number | null = null
    if (avecContenance) {
      const facteur = unites.find((u) => u.symbole === symbole)?.facteur ?? 1
      contenance = parseContenance(texte, facteur)
      if (contenance === null) {
        setLocalError('Saisissez une contenance valide.')
        return
      }
      if (contenance > CONTENANCE_MAX[unite]) {
        setLocalError(`La contenance ne doit pas dépasser ${formatContenance(CONTENANCE_MAX[unite], unite)}.`)
        return
      }
    } else if (nom === '') {
      setLocalError('Saisissez le libellé de la variante.')
      return
    }
    const cle = (f: { contenance: number | null; libelle: string | null }) => `${f.contenance}|${(f.libelle ?? '').toLowerCase()}`
    const nouveau = { contenance, libelle: nom === '' ? null : nom }
    if (value.some((f) => cle(f) === cle(nouveau))) {
      setLocalError('Ce format existe déjà.')
      return
    }
    setLocalError(null)
    setTexte('')
    setLibelle('')
    // Rangés par contenance croissante ; à contenance égale (ou sans contenance), dans l'ordre d'ajout
    onChange([...value, nouveau].sort((a, b) => (a.contenance ?? 0) - (b.contenance ?? 0)))
  }

  const ajoutParEntree = (e: KeyboardEvent) => {
    // Entrée ajoute le format au lieu d'envoyer le formulaire
    if (e.key === 'Enter') {
      e.preventDefault()
      add()
    }
  }

  const message = localError ?? error

  return (
    <fieldset className={styles.fieldset}>
      <legend>{avecContenance ? 'Formats proposés à la saisie' : 'Variantes proposées à la saisie'}</legend>

      {value.length === 0 ? (
        <p className={styles.empty}>
          {avecContenance
            ? 'Aucun format : le bénévole saisira la contenance lui-même.'
            : 'Aucune variante : le bénévole indique seulement le nombre d\'articles.'}
        </p>
      ) : (
        <ul className={styles.chips}>
          {value.map((format) => {
            const texteFormat = libelleBouton(format, unite)
            return (
              <li key={format.id ?? `n-${format.contenance}-${format.libelle}`} className={styles.chip}>
                {texteFormat}
                <input
                  className={styles.code}
                  aria-label={`Code AÏDA de ${texteFormat}`}
                  placeholder="Code AÏDA"
                  value={format.codeAida ?? ''}
                  maxLength={50}
                  onChange={(e) => onChange(value.map((f) => (f === format ? { ...f, codeAida: e.target.value } : f)))}
                  onKeyDown={(e) => {
                    // Entrée n'envoie pas le formulaire pendant la saisie d'un code
                    if (e.key === 'Enter') e.preventDefault()
                  }}
                />
                <button
                  type="button"
                  className={styles.remove}
                  onClick={() => onChange(value.filter((f) => f !== format))}
                  aria-label={`Retirer le format ${texteFormat}`}
                >
                  ×
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {value.length < MAX_FORMATS && (
        <div className={styles.add}>
          <label htmlFor={`${id}-libelle`} className="visually-hidden">
            {avecContenance ? 'Libellé de la variante (facultatif)' : 'Libellé de la variante'}
          </label>
          <input
            id={`${id}-libelle`}
            className={styles.input}
            placeholder={avecContenance ? 'Variante (facultatif)' : 'ex. T4'}
            value={libelle}
            maxLength={LIBELLE_MAX}
            onChange={(e) => setLibelle(e.target.value)}
            onKeyDown={ajoutParEntree}
          />
          {avecContenance && (
            <>
              <label htmlFor={`${id}-valeur`} className="visually-hidden">
                Contenance à ajouter
              </label>
              <input
                id={`${id}-valeur`}
                className={styles.contenance}
                inputMode="decimal"
                placeholder="ex. 500"
                value={texte}
                onChange={(e) => setTexte(e.target.value)}
                onKeyDown={ajoutParEntree}
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
            </>
          )}
          <Button variant="secondary" onClick={add}>
            Ajouter
          </Button>
        </div>
      )}

      {avecContenance && (
        <p className={styles.empty}>
          Une variante distingue deux produits de même contenance (ex. « Olive / colza » et « Tournesol » en 1 L).
        </p>
      )}

      {message && (
        <p id={`${id}-erreur`} className={styles.error}>
          {message}
        </p>
      )}
    </fieldset>
  )
}
