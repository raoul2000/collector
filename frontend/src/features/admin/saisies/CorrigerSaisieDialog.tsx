import { useState } from 'react'
import type { Categorie, SaisieAdmin } from '../../../api/types'
import { Dialog } from '../../../components/Dialog'
import { Select } from '../../../components/Select'
import { toast } from '../../../components/toast'
import { SaisieForm, type ContenuForm } from '../../saisie/SaisieForm'
import styles from '../admin.module.css'
import { useCorrigerSaisie } from '../api'
import { handleMutationError } from '../errors'

export interface CorrigerSaisieDialogProps {
  saisie: SaisieAdmin
  categories: Categorie[]
  onClose: () => void
}

/**
 * Correction d'une saisie par un responsable (catégorie, contenance, quantité).
 */
export function CorrigerSaisieDialog({ saisie, categories, onClose }: CorrigerSaisieDialogProps) {
  const corriger = useCorrigerSaisie()
  const [categorieId, setCategorieId] = useState(saisie.categorieId)
  const categorie = categories.find((c) => c.id === categorieId)
  const initial = categorieId === saisie.categorieId ? saisie : undefined

  const enregistrer = (contenu: ContenuForm) => {
    corriger.mutate(
      { id: saisie.id, correction: { categorieId, ...contenu } },
      {
        onSuccess: () => {
          toast.success('Saisie corrigée.')
          onClose()
        },
        onError: (error) => handleMutationError(error),
      },
    )
  }

  return (
    <Dialog open title={`Corriger la saisie de ${saisie.prenom}`} onClose={onClose}>
      <div className={styles.form}>
        <p className={styles.muted}>
          {saisie.magasinNom} · {new Date(saisie.saisieLe).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
        </p>
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
