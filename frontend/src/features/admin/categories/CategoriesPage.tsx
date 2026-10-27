import { useState } from 'react'
import type { Categorie } from '../../../api/types'
import { Alert } from '../../../components/Alert'
import { Badge } from '../../../components/Badge'
import { Button } from '../../../components/Button'
import { ConfirmDialog } from '../../../components/ConfirmDialog'
import { Table } from '../../../components/Table'
import { toast } from '../../../components/toast'
import { formatContenance, UNITE_LIBELLES } from '../../../lib/format'
import styles from '../admin.module.css'
import { useCategories, useDeleteCategorie, useReorderCategories } from '../api'
import { handleMutationError } from '../errors'
import { PageHeader } from '../PageHeader'
import { CategorieFormDialog } from './CategorieFormDialog'
import pageStyles from './CategoriesPage.module.css'

export function CategoriesPage() {
  const categories = useCategories()
  const reorder = useReorderCategories()
  const deleteCategorie = useDeleteCategorie()

  // undefined : formulaire fermé ; null : création ; Categorie : modification
  const [edited, setEdited] = useState<Categorie | null>()
  const [toDelete, setToDelete] = useState<Categorie | null>(null)

  const move = (index: number, delta: -1 | 1) => {
    if (!categories.data) {
      return
    }
    const ids = categories.data.map((c) => c.id)
    const [id] = ids.splice(index, 1)
    ids.splice(index + delta, 0, id!)
    reorder.mutate(ids, { onError: (error) => handleMutationError(error) })
  }

  const confirmDelete = () => {
    if (!toDelete) {
      return
    }
    deleteCategorie.mutate(toDelete.id, {
      onSuccess: () => toast.success(`Catégorie « ${toDelete.nom} » supprimée.`),
      onError: (error) => handleMutationError(error),
      onSettled: () => setToDelete(null),
    })
  }

  return (
    <>
      <PageHeader
        title="Catégories"
        description="Types de produits proposés à la saisie, dans l'ordre d'affichage (les plus fréquents en premier)."
        actions={<Button onClick={() => setEdited(null)}>Nouvelle catégorie</Button>}
      />

      {categories.isPending && <p className={styles.loading}>Chargement…</p>}
      {categories.isError && <Alert kind="error">{categories.error.message}</Alert>}
      {categories.data && (
        <Table>
          <thead>
            <tr>
              <th>Ordre</th>
              <th>Catégorie</th>
              <th>Mesure</th>
              <th>Formats</th>
              <th>Statut</th>
              <th className={styles.numeric}>Saisies</th>
              <th>
                <span className="visually-hidden">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {categories.data.length === 0 && (
              <tr>
                <td colSpan={7} className={styles.empty}>
                  Aucune catégorie pour l'instant.
                </td>
              </tr>
            )}
            {categories.data.map((categorie, index) => (
              <tr key={categorie.id}>
                <td>
                  <div className={pageStyles.order}>
                    <button
                      type="button"
                      className={pageStyles.arrow}
                      onClick={() => move(index, -1)}
                      disabled={index === 0 || reorder.isPending}
                      aria-label={`Monter « ${categorie.nom} »`}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className={pageStyles.arrow}
                      onClick={() => move(index, 1)}
                      disabled={index === categories.data.length - 1 || reorder.isPending}
                      aria-label={`Descendre « ${categorie.nom} »`}
                    >
                      ↓
                    </button>
                  </div>
                </td>
                <td>
                  {categorie.nom}
                  {categorie.codeReference && <div className={styles.muted}>{categorie.codeReference}</div>}
                </td>
                <td>{UNITE_LIBELLES[categorie.unite]}</td>
                <td>
                  {categorie.unite === 'unite' ? (
                    <span className={styles.muted}>—</span>
                  ) : categorie.formats.length === 0 ? (
                    <span className={styles.muted}>Aucun</span>
                  ) : (
                    categorie.formats.map((f) => formatContenance(f, categorie.unite)).join(' · ')
                  )}
                </td>
                <td>{categorie.active ? <Badge kind="success">Active</Badge> : <Badge>Désactivée</Badge>}</td>
                <td className={styles.numeric}>{categorie.nbSaisies}</td>
                <td>
                  <div className={styles.actionsCell}>
                    <Button size="sm" variant="secondary" onClick={() => setEdited(categorie)}>
                      Modifier
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => setToDelete(categorie)}
                      disabled={categorie.nbSaisies > 0}
                      title={categorie.nbSaisies > 0 ? 'Cette catégorie a des saisies : désactivez-la plutôt.' : undefined}
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

      {edited !== undefined && <CategorieFormDialog categorie={edited} onClose={() => setEdited(undefined)} />}

      <ConfirmDialog
        open={toDelete !== null}
        title="Supprimer la catégorie ?"
        confirmLabel="Supprimer"
        danger
        loading={deleteCategorie.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      >
        La catégorie « {toDelete?.nom} » et ses formats seront définitivement supprimés.
      </ConfirmDialog>
    </>
  )
}
