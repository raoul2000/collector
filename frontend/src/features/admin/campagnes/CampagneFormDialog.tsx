import { useState, type FormEvent } from 'react'
import type { Campagne } from '../../../api/types'
import { Alert } from '../../../components/Alert'
import { Button } from '../../../components/Button'
import { Checkbox } from '../../../components/Checkbox'
import { Dialog } from '../../../components/Dialog'
import { TextField } from '../../../components/TextField'
import { toast } from '../../../components/toast'
import styles from '../admin.module.css'
import { useMagasins, useSaveCampagne } from '../api'
import { handleMutationError, type FieldErrors } from '../errors'

export interface CampagneFormDialogProps {
  /** null pour une création */
  campagne: Campagne | null
  onClose: () => void
}

export function CampagneFormDialog({ campagne, onClose }: CampagneFormDialogProps) {
  const save = useSaveCampagne()
  const magasins = useMagasins()

  const [nom, setNom] = useState(campagne?.nom ?? '')
  const [dateDebut, setDateDebut] = useState(campagne?.dateDebut ?? '')
  const [dateFin, setDateFin] = useState(campagne?.dateFin ?? '')
  const [magasinIds, setMagasinIds] = useState<number[]>(campagne?.magasinIds ?? [])
  const [errors, setErrors] = useState<FieldErrors>({})

  const toggleMagasin = (id: number, checked: boolean) =>
    setMagasinIds((ids) => (checked ? [...ids, id] : ids.filter((i) => i !== id)))

  const submit = (event: FormEvent) => {
    event.preventDefault()
    setErrors({})
    save.mutate(
      { id: campagne?.id, input: { nom, dateDebut, dateFin, magasinIds } },
      {
        onSuccess: (saved) => {
          toast.success(`Campagne « ${saved.nom} » enregistrée.`)
          onClose()
        },
        onError: (error) => handleMutationError(error, setErrors),
      },
    )
  }

  // Un magasin désactivé n'est proposé que s'il est déjà rattaché à la campagne
  const proposes = magasins.data?.filter((m) => m.actif || magasinIds.includes(m.id)) ?? []

  return (
    <Dialog
      open
      title={campagne ? 'Modifier la campagne' : 'Nouvelle campagne'}
      onClose={onClose}
      actions={
        <>
          <Button variant="secondary" onClick={onClose} disabled={save.isPending}>
            Annuler
          </Button>
          <Button type="submit" form="campagne-form" loading={save.isPending}>
            Enregistrer
          </Button>
        </>
      }
    >
      <form id="campagne-form" className={styles.form} onSubmit={submit} noValidate>
        <TextField
          label="Nom"
          placeholder="Collecte novembre 2026"
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          error={errors.nom}
          maxLength={100}
          required
          autoFocus
        />
        <div className={styles.row}>
          <TextField
            label="Premier jour"
            type="date"
            value={dateDebut}
            onChange={(e) => setDateDebut(e.target.value)}
            error={errors.dateDebut}
            required
          />
          <TextField
            label="Dernier jour"
            type="date"
            value={dateFin}
            min={dateDebut || undefined}
            onChange={(e) => setDateFin(e.target.value)}
            error={errors.dateFin}
            required
          />
        </div>

        <fieldset className={styles.fieldset}>
          <legend>Magasins participants ({magasinIds.length})</legend>
          {magasins.isPending && <p className={styles.muted}>Chargement des magasins…</p>}
          {magasins.isError && <Alert kind="error">{magasins.error.message}</Alert>}
          {magasins.data && proposes.length === 0 && (
            <p className={styles.muted}>Aucun magasin : créez-les d'abord dans l'onglet « Magasins ».</p>
          )}
          {proposes.length > 0 && (
            <div className={styles.checkList}>
              {proposes.map((magasin) => (
                <Checkbox
                  key={magasin.id}
                  label={[magasin.nom, magasin.ville].filter(Boolean).join(' – ') + (magasin.actif ? '' : ' (désactivé)')}
                  checked={magasinIds.includes(magasin.id)}
                  onChange={(e) => toggleMagasin(magasin.id, e.target.checked)}
                />
              ))}
            </div>
          )}
          {errors.magasinIds && <p className={styles.fieldError}>{errors.magasinIds}</p>}
        </fieldset>
      </form>
    </Dialog>
  )
}
