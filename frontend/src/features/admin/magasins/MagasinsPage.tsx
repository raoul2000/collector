import { useState } from 'react'
import type { Magasin } from '../../../api/types'
import { Alert } from '../../../components/Alert'
import { Badge } from '../../../components/Badge'
import { Button } from '../../../components/Button'
import { ConfirmDialog } from '../../../components/ConfirmDialog'
import { Table } from '../../../components/Table'
import { toast } from '../../../components/toast'
import styles from '../admin.module.css'
import { useDeleteMagasin, useMagasins } from '../api'
import { handleMutationError } from '../errors'
import { PageHeader } from '../PageHeader'
import { MagasinFormDialog } from './MagasinFormDialog'

export function MagasinsPage() {
  const magasins = useMagasins()
  const deleteMagasin = useDeleteMagasin()

  // undefined : formulaire fermé ; null : création ; Magasin : modification
  const [edited, setEdited] = useState<Magasin | null>()
  const [toDelete, setToDelete] = useState<Magasin | null>(null)

  const confirmDelete = () => {
    if (!toDelete) {
      return
    }
    deleteMagasin.mutate(toDelete.id, {
      onSuccess: () => toast.success(`Magasin « ${toDelete.nom} » supprimé.`),
      onError: (error) => handleMutationError(error),
      onSettled: () => setToDelete(null),
    })
  }

  return (
    <>
      <PageHeader
        title="Magasins"
        description="Points de collecte. Un magasin désactivé n'est plus proposé aux bénévoles."
        actions={<Button onClick={() => setEdited(null)}>Nouveau magasin</Button>}
      />

      {magasins.isPending && <p className={styles.loading}>Chargement…</p>}
      {magasins.isError && <Alert kind="error">{magasins.error.message}</Alert>}
      {magasins.data && (
        <Table>
          <thead>
            <tr>
              <th>Magasin</th>
              <th>Ville / quartier</th>
              <th>Statut</th>
              <th className={styles.numeric}>Saisies</th>
              <th>
                <span className="visually-hidden">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {magasins.data.length === 0 && (
              <tr>
                <td colSpan={5} className={styles.empty}>
                  Aucun magasin pour l'instant.
                </td>
              </tr>
            )}
            {magasins.data.map((magasin) => (
              <tr key={magasin.id}>
                <td>{magasin.nom}</td>
                <td>{magasin.ville || <span className={styles.muted}>—</span>}</td>
                <td>{magasin.actif ? <Badge kind="success">Actif</Badge> : <Badge>Désactivé</Badge>}</td>
                <td className={styles.numeric}>{magasin.nbSaisies}</td>
                <td>
                  <div className={styles.actionsCell}>
                    <Button size="sm" variant="secondary" onClick={() => setEdited(magasin)}>
                      Modifier
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => setToDelete(magasin)}
                      disabled={magasin.nbSaisies > 0}
                      title={magasin.nbSaisies > 0 ? 'Ce magasin a des saisies : désactivez-le plutôt.' : undefined}
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

      {edited !== undefined && <MagasinFormDialog magasin={edited} onClose={() => setEdited(undefined)} />}

      <ConfirmDialog
        open={toDelete !== null}
        title="Supprimer le magasin ?"
        confirmLabel="Supprimer"
        danger
        loading={deleteMagasin.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      >
        Le magasin « {toDelete?.nom} » sera définitivement supprimé.
      </ConfirmDialog>
    </>
  )
}
