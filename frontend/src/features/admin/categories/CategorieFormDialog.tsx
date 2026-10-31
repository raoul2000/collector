import { useState, type FormEvent } from 'react'
import type { Categorie, Unite } from '../../../api/types'
import { Button } from '../../../components/Button'
import { Checkbox } from '../../../components/Checkbox'
import { Dialog } from '../../../components/Dialog'
import { Select } from '../../../components/Select'
import { TextField } from '../../../components/TextField'
import { toast } from '../../../components/toast'
import { UNITE_LIBELLES } from '../../../lib/format'
import styles from '../admin.module.css'
import { useSaveCategorie, useSections } from '../api'
import { handleMutationError, type FieldErrors } from '../errors'
import { FormatsEditor } from './FormatsEditor'

export interface CategorieFormDialogProps {
  /** null pour une création */
  categorie: Categorie | null
  onClose: () => void
}

const UNITES: Unite[] = ['kg', 'L', 'unite']

export function CategorieFormDialog({ categorie, onClose }: CategorieFormDialogProps) {
  const save = useSaveCategorie()
  const sections = useSections().data ?? []
  const [nom, setNom] = useState(categorie?.nom ?? '')
  const [sectionId, setSectionId] = useState<number | null>(categorie?.sectionId ?? null)
  const [unite, setUnite] = useState<Unite>(categorie?.unite ?? 'kg')
  const [codeReference, setCodeReference] = useState(categorie?.codeReference ?? '')
  const [active, setActive] = useState(categorie?.active ?? true)
  const [formats, setFormats] = useState<number[]>(categorie?.formats ?? [])
  const [errors, setErrors] = useState<FieldErrors>({})

  // Changer l'unité fausserait les saisies existantes (grammes ↔ millilitres)
  const uniteVerrouillee = (categorie?.nbSaisies ?? 0) > 0

  const changeUnite = (value: Unite) => {
    setUnite(value)
    // Les formats n'ont plus de sens dans une autre unité
    setFormats([])
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    setErrors({})
    save.mutate(
      { id: categorie?.id, input: { nom, sectionId, unite, codeReference, active, formats: unite === 'unite' ? [] : formats } },
      {
        onSuccess: (saved) => {
          toast.success(`Catégorie « ${saved.nom} » enregistrée.`)
          onClose()
        },
        onError: (error) => handleMutationError(error, setErrors),
      },
    )
  }

  return (
    <Dialog
      open
      title={categorie ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
      onClose={onClose}
      actions={
        <>
          <Button variant="secondary" onClick={onClose} disabled={save.isPending}>
            Annuler
          </Button>
          <Button type="submit" form="categorie-form" loading={save.isPending}>
            Enregistrer
          </Button>
        </>
      }
    >
      <form id="categorie-form" className={styles.form} onSubmit={submit} noValidate>
        <TextField
          label="Nom"
          placeholder="Pâtes"
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          error={errors.nom}
          maxLength={100}
          required
          autoFocus
        />
        {(sections.length > 0 || sectionId !== null) && (
          <Select
            label="Section"
            value={sectionId ?? ''}
            onChange={(e) => setSectionId(e.target.value === '' ? null : Number(e.target.value))}
            error={errors.sectionId}
          >
            <option value="">Sans section</option>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nom}
              </option>
            ))}
          </Select>
        )}
        <div className={styles.row}>
          <Select
            label="Mesure"
            value={unite}
            onChange={(e) => changeUnite(e.target.value as Unite)}
            disabled={uniteVerrouillee}
            hint={uniteVerrouillee ? 'Non modifiable : des saisies existent.' : undefined}
            error={errors.unite}
          >
            {UNITES.map((u) => (
              <option key={u} value={u}>
                {UNITE_LIBELLES[u]}
              </option>
            ))}
          </Select>
          <TextField
            label="Code de référence"
            hint="Facultatif (liste Croix-Rouge)."
            value={codeReference}
            onChange={(e) => setCodeReference(e.target.value)}
            error={errors.codeReference}
            maxLength={50}
          />
        </div>

        {unite !== 'unite' && <FormatsEditor unite={unite} value={formats} onChange={setFormats} error={errors.formats} />}

        <Checkbox label="Catégorie active" checked={active} onChange={(e) => setActive(e.target.checked)} />
      </form>
    </Dialog>
  )
}
