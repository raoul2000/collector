import { useState, type FormEvent } from 'react'
import type { Section } from '../../../api/types'
import { Button } from '../../../components/Button'
import { Dialog } from '../../../components/Dialog'
import { TextField } from '../../../components/TextField'
import { toast } from '../../../components/toast'
import styles from '../admin.module.css'
import { useSaveSection } from '../api'
import { handleMutationError, type FieldErrors } from '../errors'

export interface SectionFormDialogProps {
  /** null pour une création */
  section: Section | null
  onClose: () => void
}

export function SectionFormDialog({ section, onClose }: SectionFormDialogProps) {
  const save = useSaveSection()
  const [nom, setNom] = useState(section?.nom ?? '')
  const [errors, setErrors] = useState<FieldErrors>({})

  const submit = (event: FormEvent) => {
    event.preventDefault()
    setErrors({})
    save.mutate(
      { id: section?.id, nom },
      {
        onSuccess: (saved) => {
          toast.success(`Section « ${saved.nom} » enregistrée.`)
          onClose()
        },
        onError: (error) => handleMutationError(error, setErrors),
      },
    )
  }

  return (
    <Dialog
      open
      title={section ? 'Renommer la section' : 'Nouvelle section'}
      onClose={onClose}
      actions={
        <>
          <Button variant="secondary" onClick={onClose} disabled={save.isPending}>
            Annuler
          </Button>
          <Button type="submit" form="section-form" loading={save.isPending}>
            Enregistrer
          </Button>
        </>
      }
    >
      <form id="section-form" className={styles.form} onSubmit={submit} noValidate>
        <TextField
          label="Nom"
          placeholder="Conserves"
          hint="Intitulé affiché au-dessus de ses catégories, sur l'écran de saisie."
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          error={errors.nom}
          maxLength={60}
          required
          autoFocus
        />
      </form>
    </Dialog>
  )
}
