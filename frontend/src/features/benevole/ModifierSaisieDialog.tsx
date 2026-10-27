import { useState } from 'react'
import type { CategorieRef } from '../../api/types'
import { Alert } from '../../components/Alert'
import { Button } from '../../components/Button'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { Dialog } from '../../components/Dialog'
import { Select } from '../../components/Select'
import { toast } from '../../components/toast'
import type { SaisieLocale } from '../../db/db'
import { modifierSaisie, supprimerSaisie } from '../../db/saisies'
import { formatHeure } from '../../lib/dates'
import { demanderSynchro } from '../../sync/engine'
import { SaisieForm } from '../saisie/SaisieForm'
import styles from './benevole.module.css'

export interface ModifierSaisieDialogProps {
  saisie: SaisieLocale
  categories: CategorieRef[]
  onClose: () => void
}

/**
 * Modification ou suppression d'une saisie du téléphone.
 */
export function ModifierSaisieDialog({ saisie, categories, onClose }: ModifierSaisieDialogProps) {
  const [categorieId, setCategorieId] = useState(saisie.categorieId)
  const [confirmerSuppression, setConfirmerSuppression] = useState(false)
  const categorie = categories.find((c) => c.id === categorieId)
  // Les valeurs initiales ne s'appliquent qu'à la catégorie d'origine
  const initial = categorieId === saisie.categorieId ? saisie : undefined

  const enregistrer = async (contenu: { quantite: number; contenanceUnitaire: number | null }) => {
    await modifierSaisie(saisie.id, { categorieId, ...contenu })
    demanderSynchro()
    toast.success('Saisie modifiée.')
    onClose()
  }

  const supprimer = async () => {
    await supprimerSaisie(saisie.id)
    demanderSynchro()
    toast.info('Saisie supprimée.')
    onClose()
  }

  return (
    <>
      <Dialog
        open={!confirmerSuppression}
        title={`Saisie de ${formatHeure(saisie.saisieLe)}`}
        onClose={onClose}
        actions={
          <Button variant="danger" block onClick={() => setConfirmerSuppression(true)}>
            Supprimer cette saisie
          </Button>
        }
      >
        <div className={styles.section}>
          {saisie.corrigeParResponsable && (
            <Alert kind="warning">Cette saisie a été corrigée par {saisie.corrigeParResponsable}.</Alert>
          )}
          {saisie.erreur && <Alert kind="error">Refusée par le serveur : {saisie.erreur}</Alert>}

          <Select label="Catégorie" value={categorie ? categorieId : ''} onChange={(e) => setCategorieId(Number(e.target.value))}>
            {!categorie && (
              <option value="" disabled>
                Catégorie retirée de la collecte
              </option>
            )}
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nom}
              </option>
            ))}
          </Select>

          {categorie && (
            <SaisieForm
              key={categorie.id}
              categorie={categorie}
              initial={initial && { quantite: initial.quantite, contenanceUnitaire: initial.contenanceUnitaire }}
              submitLabel="Enregistrer"
              onSubmit={(contenu) => void enregistrer(contenu)}
            />
          )}
        </div>
      </Dialog>

      <ConfirmDialog
        open={confirmerSuppression}
        title="Supprimer la saisie ?"
        confirmLabel="Supprimer"
        danger
        onConfirm={() => void supprimer()}
        onCancel={() => setConfirmerSuppression(false)}
      >
        Elle ne sera plus comptée dans la collecte.
      </ConfirmDialog>
    </>
  )
}
