import { useState } from 'react'
import type { Magasin, SaisieAdmin } from '../../../api/types'
import { Alert } from '../../../components/Alert'
import { Button } from '../../../components/Button'
import { Dialog } from '../../../components/Dialog'
import { Select } from '../../../components/Select'
import { toast } from '../../../components/toast'
import styles from '../admin.module.css'
import { useChangerMagasin } from '../api'
import { handleMutationError, type FieldErrors } from '../errors'
import { nomMagasin } from './magasins'

export interface ChangerMagasinDialogProps {
  saisies: SaisieAdmin[]
  /** Magasins actifs participant aux campagnes de toutes ces saisies */
  magasins: Magasin[]
  /** Appelé après le changement (la sélection peut alors être vidée) */
  onDone: () => void
  onClose: () => void
}

const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? 's' : ''}`

/**
 * Déplacement de plusieurs saisies vers un autre magasin (bénévole qui s'est trompé de magasin).
 */
export function ChangerMagasinDialog({ saisies, magasins, onDone, onClose }: ChangerMagasinDialogProps) {
  const changer = useChangerMagasin()
  const [magasinId, setMagasinId] = useState<number | undefined>(undefined)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  // Répartition actuelle : « 12 saisies de Lidl, 3 saisies d'Auchan »
  const parMagasin = new Map<string, number>()
  for (const s of saisies) {
    parMagasin.set(s.magasinNom, (parMagasin.get(s.magasinNom) ?? 0) + 1)
  }
  const cible = magasins.find((m) => m.id === magasinId)
  const aDeplacer = saisies.filter((s) => s.magasinId !== magasinId).length

  const confirmer = () => {
    if (magasinId === undefined) {
      return
    }
    changer.mutate(
      { ids: saisies.map((s) => s.id), magasinId },
      {
        onSuccess: ({ nbModifiees }) => {
          toast.success(`${pluriel(nbModifiees, 'saisie')} déplacée${nbModifiees > 1 ? 's' : ''} vers ${cible ? nomMagasin(cible) : 'le magasin choisi'}.`)
          onDone()
          onClose()
        },
        onError: (error) => handleMutationError(error, setFieldErrors),
      },
    )
  }

  return (
    <Dialog
      open
      title="Changer de magasin"
      onClose={onClose}
      actions={
        <>
          <Button variant="secondary" onClick={onClose} disabled={changer.isPending}>
            Annuler
          </Button>
          <Button onClick={confirmer} loading={changer.isPending} disabled={!cible || aDeplacer === 0}>
            Déplacer {pluriel(aDeplacer, 'saisie')}
          </Button>
        </>
      }
    >
      <div className={styles.form}>
        <p>
          Sélection :{' '}
          {[...parMagasin].map(([nom, n]) => `${pluriel(n, 'saisie')} à ${nom}`).join(', ')}.
        </p>
        {magasins.length === 0 ? (
          <Alert kind="warning">Aucun magasin actif ne participe à la campagne de ces saisies.</Alert>
        ) : (
          <Select
            label="Nouveau magasin"
            value={magasinId ?? ''}
            error={fieldErrors.magasinId ?? fieldErrors.ids}
            onChange={(e) => setMagasinId(e.target.value === '' ? undefined : Number(e.target.value))}
          >
            <option value="">Choisir…</option>
            {magasins.map((m) => (
              <option key={m.id} value={m.id}>
                {nomMagasin(m)}
              </option>
            ))}
          </Select>
        )}
        <p className={styles.muted}>
          La correction est transmise au téléphone du bénévole à sa prochaine synchronisation. Pensez à lui faire
          choisir le bon magasin dans ses Réglages.
        </p>
      </div>
    </Dialog>
  )
}
