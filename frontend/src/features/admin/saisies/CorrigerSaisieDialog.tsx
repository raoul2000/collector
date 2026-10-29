import { useState } from 'react'
import type { Categorie, Magasin, SaisieAdmin } from '../../../api/types'
import { Dialog } from '../../../components/Dialog'
import { Select } from '../../../components/Select'
import { toast } from '../../../components/toast'
import { SaisieForm, type ContenuForm } from '../../saisie/SaisieForm'
import styles from '../admin.module.css'
import { useCorrigerSaisie } from '../api'
import { handleMutationError, type FieldErrors } from '../errors'
import { nomMagasin } from './magasins'

export interface CorrigerSaisieDialogProps {
  saisie: SaisieAdmin
  categories: Categorie[]
  /** Magasins actifs participant à la campagne de la saisie */
  magasins: Magasin[]
  onClose: () => void
}

/**
 * Correction d'une saisie par un responsable (magasin, catégorie, contenance, quantité).
 */
export function CorrigerSaisieDialog({ saisie, categories, magasins, onClose }: CorrigerSaisieDialogProps) {
  const corriger = useCorrigerSaisie()
  const [magasinId, setMagasinId] = useState(saisie.magasinId)
  const [categorieId, setCategorieId] = useState(saisie.categorieId)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const categorie = categories.find((c) => c.id === categorieId)
  const initial = categorieId === saisie.categorieId ? saisie : undefined
  // Le magasin actuel reste proposé même s'il n'est plus disponible (désactivé entre-temps)
  const actuelIndisponible = !magasins.some((m) => m.id === saisie.magasinId)

  const enregistrer = (contenu: ContenuForm) => {
    corriger.mutate(
      { id: saisie.id, correction: { magasinId, categorieId, ...contenu } },
      {
        onSuccess: () => {
          toast.success('Saisie corrigée.')
          onClose()
        },
        onError: (error) => handleMutationError(error, setFieldErrors),
      },
    )
  }

  return (
    <Dialog open title={`Corriger la saisie de ${saisie.prenom}`} onClose={onClose}>
      <div className={styles.form}>
        <p className={styles.muted}>
          {new Date(saisie.saisieLe).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
        </p>
        <Select
          label="Magasin"
          value={magasinId}
          error={fieldErrors.magasinId}
          onChange={(e) => setMagasinId(Number(e.target.value))}
        >
          {actuelIndisponible && <option value={saisie.magasinId}>{saisie.magasinNom}</option>}
          {magasins.map((m) => (
            <option key={m.id} value={m.id}>
              {nomMagasin(m)}
            </option>
          ))}
        </Select>
        <Select label="Catégorie" value={categorieId} onChange={(e) => setCategorieId(Number(e.target.value))}>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nom}
              {c.active ? '' : ' (désactivée)'}
            </option>
          ))}
        </Select>
        {categorie && (
          <SaisieForm
            key={categorie.id}
            categorie={categorie}
            initial={initial && { quantite: initial.quantite, contenanceUnitaire: initial.contenanceUnitaire }}
            submitLabel={corriger.isPending ? 'Enregistrement…' : 'Enregistrer la correction'}
            onSubmit={enregistrer}
          />
        )}
      </div>
    </Dialog>
  )
}
