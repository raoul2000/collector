import { useId, useState, type FormEvent } from 'react'
import type { Unite } from '../../api/types'
import { Button } from '../../components/Button'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { QuantityStepper } from '../../components/QuantityStepper'
import { Tile } from '../../components/Tile'
import { CONTENANCE_MAX, parseContenance, UNITES_SAISIE } from '../../lib/contenance'
import { formatContenance } from '../../lib/format'
import type { BoutonSaisie } from './libelle'
import styles from './SaisieForm.module.css'

/** Au-delà, une confirmation est demandée (cf. spécifications 4.2) */
export const SEUIL_QUANTITE = 50

export interface ContenuForm {
  quantite: number
  contenanceUnitaire: number | null
  /** Bouton choisi (null : contenance libre, inconnue, ou aucune variante choisie) */
  formatId: number | null
}

export interface SaisieFormProps {
  unite: Unite
  /** Boutons de la catégorie : formats et variantes */
  boutons: BoutonSaisie[]
  /** Valeurs initiales (modification d'une saisie) */
  initial?: ContenuForm
  submitLabel: string
  onSubmit: (contenu: ContenuForm) => void
}

/** index : position du bouton (deux variantes peuvent avoir la même contenance) */
type Choix = { type: 'format'; index: number } | { type: 'autre' } | { type: 'inconnue' } | null

function choixInitial(unite: Unite, boutons: BoutonSaisie[], initial?: ContenuForm): Choix {
  if (!initial) {
    return null
  }
  const parId = initial.formatId === null ? -1 : boutons.findIndex((b) => b.id === initial.formatId)
  if (parId >= 0 && boutons[parId]!.contenance === initial.contenanceUnitaire) {
    return { type: 'format', index: parId }
  }
  if (unite === 'unite') {
    return null
  }
  if (initial.contenanceUnitaire === null) {
    return { type: 'inconnue' }
  }
  // Saisie sans bouton (antérieure aux variantes) : le format simple de même contenance
  const simple = boutons.findIndex((b) => b.libelle === null && b.contenance === initial.contenanceUnitaire)
  return simple >= 0 ? { type: 'format', index: simple } : { type: 'autre' }
}

/**
 * Détail d'une saisie pour une catégorie : contenance (formats et variantes prédéfinis, valeur libre ou inconnue)
 * et quantité. Pour une catégorie à l'unité, les variantes éventuelles (ex. tailles de couches) sont facultatives.
 */
export function SaisieForm({ unite, boutons, initial, submitLabel, onSubmit }: SaisieFormProps) {
  const id = useId()
  const avecContenance = unite !== 'unite'
  const unitesSaisie = avecContenance ? UNITES_SAISIE[unite] : []

  const [quantite, setQuantite] = useState(initial?.quantite ?? 1)
  const [choix, setChoix] = useState<Choix>(() => choixInitial(unite, boutons, initial))
  const autreInitial = choixInitial(unite, boutons, initial)?.type === 'autre'
  const [autreTexte, setAutreTexte] = useState(autreInitial ? String(initial?.contenanceUnitaire) : '')
  // Une valeur libre initiale est exprimée dans l'unité de base (g ou ml)
  const [autreSymbole, setAutreSymbole] = useState<string>(
    autreInitial ? (unite === 'L' ? 'ml' : 'g') : (unitesSaisie[0]?.symbole ?? ''),
  )
  const [erreur, setErreur] = useState<string | null>(null)
  const [confirmation, setConfirmation] = useState<{ messages: string[]; contenu: ContenuForm } | null>(null)

  const choisir = (nouveau: Choix) => {
    setChoix(nouveau)
    setErreur(null)
  }

  const valider = (event: FormEvent) => {
    event.preventDefault()

    let contenanceUnitaire: number | null = null
    const bouton = choix?.type === 'format' ? boutons[choix.index] : undefined
    if (avecContenance) {
      if (choix === null) {
        setErreur(`Choisissez ${unite === 'kg' ? 'le poids' : 'le volume'} de l'article.`)
        return
      }
      if (bouton) {
        contenanceUnitaire = bouton.contenance
      } else if (choix.type === 'autre') {
        const facteur = unitesSaisie.find((u) => u.symbole === autreSymbole)?.facteur ?? 1
        contenanceUnitaire = parseContenance(autreTexte, facteur)
        if (contenanceUnitaire === null) {
          setErreur(`Saisissez ${unite === 'kg' ? 'un poids' : 'un volume'} valide.`)
          return
        }
        if (contenanceUnitaire > CONTENANCE_MAX[unite]) {
          setErreur(`La contenance ne doit pas dépasser ${formatContenance(CONTENANCE_MAX[unite], unite)}.`)
          return
        }
      }
    }

    const contenu = { quantite, contenanceUnitaire, formatId: bouton?.id ?? null }
    const messages = [
      ...(avecContenance && choix?.type === 'inconnue'
        ? [`${unite === 'kg' ? 'Le poids' : 'Le volume'} de ces articles ne sera pas comptabilisé.`]
        : []),
      ...(quantite > SEUIL_QUANTITE ? [`La quantité est inhabituelle : ${quantite} articles.`] : []),
    ]
    if (messages.length > 0) {
      setConfirmation({ messages, contenu })
      return
    }
    onSubmit(contenu)
  }

  return (
    <form className={styles.form} onSubmit={valider} noValidate>
      {avecContenance && (
        <fieldset className={styles.fieldset} aria-describedby={erreur ? `${id}-erreur` : undefined}>
          <legend className={styles.legend}>{unite === 'kg' ? 'Poids d\'un article' : 'Volume d\'un article'}</legend>
          <div className={styles.grid}>
            {boutons.map((bouton, index) => (
              <Tile
                key={bouton.id ?? `c${bouton.contenance}`}
                selected={choix?.type === 'format' && choix.index === index}
                onClick={() => choisir({ type: 'format', index })}
                detail={bouton.libelle && bouton.contenance !== null ? formatContenance(bouton.contenance, unite) : undefined}
              >
                {bouton.libelle ?? formatContenance(bouton.contenance!, unite)}
              </Tile>
            ))}
            <Tile selected={choix?.type === 'autre'} onClick={() => choisir({ type: 'autre' })}>
              Autre…
            </Tile>
            <Tile selected={choix?.type === 'inconnue'} onClick={() => choisir({ type: 'inconnue' })} detail="illisible">
              Inconnu
            </Tile>
          </div>

          {choix?.type === 'autre' && (
            <div className={styles.autre}>
              <label htmlFor={`${id}-autre`} className="visually-hidden">
                {unite === 'kg' ? 'Poids indiqué sur l\'emballage' : 'Volume indiqué sur l\'emballage'}
              </label>
              <input
                id={`${id}-autre`}
                className={styles.autreInput}
                inputMode="decimal"
                placeholder={unite === 'kg' ? 'ex. 750' : 'ex. 75'}
                value={autreTexte}
                onChange={(e) => {
                  setAutreTexte(e.target.value)
                  setErreur(null)
                }}
                autoFocus
              />
              <label htmlFor={`${id}-symbole`} className="visually-hidden">
                Unité
              </label>
              <select
                id={`${id}-symbole`}
                className={styles.autreSelect}
                value={autreSymbole}
                onChange={(e) => setAutreSymbole(e.target.value)}
              >
                {unitesSaisie.map((u) => (
                  <option key={u.symbole} value={u.symbole}>
                    {u.symbole}
                  </option>
                ))}
              </select>
            </div>
          )}

          {erreur && (
            <p id={`${id}-erreur`} className={styles.erreur} role="alert">
              {erreur}
            </p>
          )}
        </fieldset>
      )}

      {!avecContenance && boutons.length > 0 && (
        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>Précision (facultatif)</legend>
          <div className={styles.grid}>
            {boutons.map((bouton, index) => {
              const selectionne = choix?.type === 'format' && choix.index === index
              return (
                <Tile
                  key={bouton.id ?? bouton.libelle}
                  selected={selectionne}
                  // Un second appui retire la précision
                  onClick={() => choisir(selectionne ? null : { type: 'format', index })}
                >
                  {bouton.libelle}
                </Tile>
              )
            })}
          </div>
        </fieldset>
      )}

      <QuantityStepper label="Nombre d'articles" value={quantite} onChange={setQuantite} />

      <Button type="submit" size="lg" block>
        {submitLabel}
      </Button>

      <ConfirmDialog
        open={confirmation !== null}
        title="Confirmer la saisie ?"
        confirmLabel="Confirmer"
        onConfirm={() => {
          if (confirmation) {
            onSubmit(confirmation.contenu)
          }
          setConfirmation(null)
        }}
        onCancel={() => setConfirmation(null)}
      >
        {confirmation?.messages.map((message) => (
          <p key={message} className={styles.confirmMessage}>
            {message}
          </p>
        ))}
      </ConfirmDialog>
    </form>
  )
}
