import { useState, type FormEvent } from 'react'
import type { Magasin } from '../../../api/types'
import { Button } from '../../../components/Button'
import { Checkbox } from '../../../components/Checkbox'
import { Dialog } from '../../../components/Dialog'
import { TextField } from '../../../components/TextField'
import { toast } from '../../../components/toast'
import styles from '../admin.module.css'
import { useSaveMagasin } from '../api'
import { handleMutationError, type FieldErrors } from '../errors'

export interface MagasinFormDialogProps {
  /** null pour une création */
  magasin: Magasin | null
  onClose: () => void
}

export function MagasinFormDialog({ magasin, onClose }: MagasinFormDialogProps) {
  const save = useSaveMagasin()
  const [nom, setNom] = useState(magasin?.nom ?? '')
  const [ville, setVille] = useState(magasin?.ville ?? '')
  const [actif, setActif] = useState(magasin?.actif ?? true)
  const [errors, setErrors] = useState<FieldErrors>({})

  const submit = (event: FormEvent) => {
    event.preventDefault()
    setErrors({})
    save.mutate(
      { id: magasin?.id, input: { nom, ville, actif } },
      {
        onSuccess: (saved) => {
          toast.success(`Magasin « ${saved.nom} » enregistré.`)
          onClose()
        },
        onError: (error) => handleMutationError(error, setErrors),
      },
    )
  }

  return (
    <Dialog
      open
      title={magasin ? 'Modifier le magasin' : 'Nouveau magasin'}
      onClose={onClose}
      actions={
        <>
          <Button variant="secondary" onClick={onClose} disabled={save.isPending}>
            Annuler
          </Button>
          <Button type="submit" form="magasin-form" loading={save.isPending}>
            Enregistrer
          </Button>
        </>
      }
    >
      <form id="magasin-form" className={styles.form} onSubmit={submit} noValidate>
        <TextField
          label="Nom du magasin"
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          error={errors.nom}
          maxLength={100}
          required
          autoFocus
        />
        <TextField
          label="Ville ou quartier"
          hint="Facultatif. Permet de distinguer deux magasins de même enseigne."
          value={ville}
          onChange={(e) => setVille(e.target.value)}
          error={errors.ville}
          maxLength={100}
        />
        <Checkbox label="Magasin actif" checked={actif} onChange={(e) => setActif(e.target.checked)} />
      </form>
    </Dialog>
  )
}
