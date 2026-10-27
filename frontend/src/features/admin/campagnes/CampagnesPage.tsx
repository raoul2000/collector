import { useState } from 'react'
import type { Campagne } from '../../../api/types'
import { Alert } from '../../../components/Alert'
import { Badge } from '../../../components/Badge'
import { Button } from '../../../components/Button'
import { ConfirmDialog } from '../../../components/ConfirmDialog'
import { Table } from '../../../components/Table'
import { toast } from '../../../components/toast'
import { formatDate } from '../../../lib/format'
import styles from '../admin.module.css'
import { useCampagnes, useDeleteCampagne, useSetCampagneActive } from '../api'
import { handleMutationError } from '../errors'
import { PageHeader } from '../PageHeader'
import { CampagneFormDialog } from './CampagneFormDialog'

export function CampagnesPage() {
  const campagnes = useCampagnes()
  const setActive = useSetCampagneActive()
  const deleteCampagne = useDeleteCampagne()

  // undefined : formulaire fermé ; null : création ; Campagne : modification
  const [edited, setEdited] = useState<Campagne | null>()
  const [toActivate, setToActivate] = useState<Campagne | null>(null)
  const [toDelete, setToDelete] = useState<Campagne | null>(null)

  const active = campagnes.data?.find((c) => c.active)

  const changeActive = (campagne: Campagne, value: boolean) => {
    setActive.mutate(
      { id: campagne.id, active: value },
      {
        onSuccess: () =>
          toast.success(value ? `« ${campagne.nom} » est la campagne active.` : `« ${campagne.nom} » est désactivée.`),
        onError: (error) => handleMutationError(error),
        onSettled: () => setToActivate(null),
      },
    )
  }

  const confirmDelete = () => {
    if (!toDelete) {
      return
    }
    deleteCampagne.mutate(toDelete.id, {
      onSuccess: () => toast.success(`Campagne « ${toDelete.nom} » supprimée.`),
      onError: (error) => handleMutationError(error),
      onSettled: () => setToDelete(null),
    })
  }

  return (
    <>
      <PageHeader
        title="Campagnes"
        description="Chaque collecte annuelle est une campagne. Seule la campagne active est proposée aux bénévoles."
        actions={<Button onClick={() => setEdited(null)}>Nouvelle campagne</Button>}
      />

      {campagnes.data && !active && (
        <Alert kind="warning" className={styles.pageAlert}>
          Aucune campagne n'est active : les bénévoles ne peuvent pas saisir de dons.
        </Alert>
      )}

      {campagnes.isPending && <p className={styles.loading}>Chargement…</p>}
      {campagnes.isError && <Alert kind="error">{campagnes.error.message}</Alert>}
      {campagnes.data && (
        <Table>
          <thead>
            <tr>
              <th>Campagne</th>
              <th>Dates</th>
              <th className={styles.numeric}>Magasins</th>
              <th className={styles.numeric}>Saisies</th>
              <th>Statut</th>
              <th>
                <span className="visually-hidden">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {campagnes.data.length === 0 && (
              <tr>
                <td colSpan={6} className={styles.empty}>
                  Aucune campagne pour l'instant.
                </td>
              </tr>
            )}
            {campagnes.data.map((campagne) => (
              <tr key={campagne.id}>
                <td>{campagne.nom}</td>
                <td>
                  {formatDate(campagne.dateDebut)} → {formatDate(campagne.dateFin)}
                </td>
                <td className={styles.numeric}>{campagne.magasinIds.length}</td>
                <td className={styles.numeric}>{campagne.nbSaisies}</td>
                <td>{campagne.active ? <Badge kind="success">Active</Badge> : <Badge>Inactive</Badge>}</td>
                <td>
                  <div className={styles.actionsCell}>
                    {campagne.active ? (
                      <Button size="sm" variant="secondary" onClick={() => changeActive(campagne, false)}>
                        Désactiver
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => (active ? setToActivate(campagne) : changeActive(campagne, true))}
                      >
                        Activer
                      </Button>
                    )}
                    <Button size="sm" variant="secondary" onClick={() => setEdited(campagne)}>
                      Modifier
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => setToDelete(campagne)}
                      disabled={campagne.nbSaisies > 0}
                      title={campagne.nbSaisies > 0 ? 'Cette campagne contient des saisies.' : undefined}
                    >
                      Supprimer
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {edited !== undefined && <CampagneFormDialog campagne={edited} onClose={() => setEdited(undefined)} />}

      <ConfirmDialog
        open={toActivate !== null}
        title="Changer de campagne active ?"
        confirmLabel="Activer"
        loading={setActive.isPending}
        onConfirm={() => toActivate && changeActive(toActivate, true)}
        onCancel={() => setToActivate(null)}
      >
        « {toActivate?.nom} » deviendra la campagne active et « {active?.nom} » sera désactivée. Les bénévoles
        saisiront désormais dans la nouvelle campagne.
      </ConfirmDialog>

      <ConfirmDialog
        open={toDelete !== null}
        title="Supprimer la campagne ?"
        confirmLabel="Supprimer"
        danger
        loading={deleteCampagne.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      >
        La campagne « {toDelete?.nom} » sera définitivement supprimée.
      </ConfirmDialog>
    </>
  )
}
