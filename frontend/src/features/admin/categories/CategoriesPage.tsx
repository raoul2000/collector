import { Fragment, useState } from 'react'
import type { Categorie, Section } from '../../../api/types'
import { Alert } from '../../../components/Alert'
import { Badge } from '../../../components/Badge'
import { Button } from '../../../components/Button'
import { Card } from '../../../components/Card'
import { ConfirmDialog } from '../../../components/ConfirmDialog'
import { Table } from '../../../components/Table'
import { toast } from '../../../components/toast'
import { UNITE_LIBELLES } from '../../../lib/format'
import { libelleBouton } from '../../saisie/libelle'
import styles from '../admin.module.css'
import { useCategories, useDeleteCategorie, useDeleteSection, useReorderCategories, useReorderSections, useSections } from '../api'
import { handleMutationError } from '../errors'
import { PageHeader } from '../PageHeader'
import { CategorieFormDialog } from './CategorieFormDialog'
import pageStyles from './CategoriesPage.module.css'
import { RecherchesSansResultat } from './RecherchesSansResultat'
import { SectionFormDialog } from './SectionFormDialog'

/** Nouvel ordre d'une liste après déplacement d'un élément d'un cran */
function deplacer(ids: number[], index: number, delta: -1 | 1): number[] {
  const copie = [...ids]
  const [id] = copie.splice(index, 1)
  copie.splice(index + delta, 0, id!)
  return copie
}

export function CategoriesPage() {
  const categories = useCategories()
  const sections = useSections()
  const reorder = useReorderCategories()
  const reorderSections = useReorderSections()
  const deleteCategorie = useDeleteCategorie()
  const deleteSection = useDeleteSection()

  // undefined : formulaire fermé ; null : création ; objet : modification
  const [edited, setEdited] = useState<Categorie | null>()
  const [toDelete, setToDelete] = useState<Categorie | null>(null)
  const [editedSection, setEditedSection] = useState<Section | null>()
  const [sectionToDelete, setSectionToDelete] = useState<Section | null>(null)

  const listeSections = sections.data ?? []
  const nomSection = new Map(listeSections.map((s) => [s.id, s.nom]))

  // Les catégories arrivent groupées par section : on ne les déplace qu'à l'intérieur de leur section
  const move = (index: number, delta: -1 | 1) => {
    if (categories.data) {
      reorder.mutate(
        deplacer(categories.data.map((c) => c.id), index, delta),
        { onError: (error) => handleMutationError(error) },
      )
    }
  }
  const memeSection = (index: number, voisin: number) =>
    categories.data?.[voisin] !== undefined && categories.data[voisin].sectionId === categories.data[index]!.sectionId

  const moveSection = (index: number, delta: -1 | 1) => {
    reorderSections.mutate(
      deplacer(listeSections.map((s) => s.id), index, delta),
      { onError: (error) => handleMutationError(error) },
    )
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

  const confirmDeleteSection = () => {
    if (!sectionToDelete) {
      return
    }
    deleteSection.mutate(sectionToDelete.id, {
      onSuccess: () => toast.success(`Section « ${sectionToDelete.nom} » supprimée.`),
      onError: (error) => handleMutationError(error),
      onSettled: () => setSectionToDelete(null),
    })
  }

  return (
    <>
      <PageHeader
        title="Catégories"
        description="Types de produits proposés à la saisie, regroupés par section, dans l'ordre d'affichage (les plus fréquents en premier)."
        actions={<Button onClick={() => setEdited(null)}>Nouvelle catégorie</Button>}
      />

      <Card
        title="Sections"
        className={pageStyles.sections}
        actions={
          <Button size="sm" variant="secondary" onClick={() => setEditedSection(null)}>
            Nouvelle section
          </Button>
        }
      >
        <p className={styles.muted}>
          Groupes de catégories : sur l'écran de saisie, chaque section a son intitulé et un raccourci en haut de la grille.
        </p>
        {sections.isError && <Alert kind="error">{sections.error.message}</Alert>}
        {sections.data && sections.data.length === 0 && (
          <p className={styles.muted}>Aucune section : les catégories sont affichées en une seule liste.</p>
        )}
        {sections.data && sections.data.length > 0 && (
          <Table>
            <thead>
              <tr>
                <th>Ordre</th>
                <th>Section</th>
                <th className={styles.numeric}>Catégories</th>
                <th>
                  <span className="visually-hidden">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {sections.data.map((section, index) => (
                <tr key={section.id}>
                  <td>
                    <Fleches
                      nom={section.nom}
                      haut={index > 0}
                      bas={index < listeSections.length - 1}
                      disabled={reorderSections.isPending}
                      onMove={(delta) => moveSection(index, delta)}
                    />
                  </td>
                  <td>{section.nom}</td>
                  <td className={styles.numeric}>{section.nbCategories}</td>
                  <td>
                    <div className={styles.actionsCell}>
                      <Button size="sm" variant="secondary" onClick={() => setEditedSection(section)} aria-label={`Renommer « ${section.nom} »`}>
                        Renommer
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => setSectionToDelete(section)} aria-label={`Supprimer la section « ${section.nom} »`}>
                        Supprimer
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <RecherchesSansResultat categories={categories.data ?? []} />

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
              <Fragment key={categorie.id}>
                {listeSections.length > 0 && !memeSection(index, index - 1) && (
                  <tr className={pageStyles.groupe}>
                    <th colSpan={7} scope="colgroup">
                      {categorie.sectionId === null ? 'Sans section' : (nomSection.get(categorie.sectionId) ?? '…')}
                    </th>
                  </tr>
                )}
                <tr>
                  <td>
                    <Fleches
                      nom={categorie.nom}
                      haut={memeSection(index, index - 1)}
                      bas={memeSection(index, index + 1)}
                      disabled={reorder.isPending}
                      onMove={(delta) => move(index, delta)}
                    />
                  </td>
                  <td>
                    {categorie.nom}
                    {categorie.codeReference && <div className={styles.muted}>{categorie.codeReference}</div>}
                  </td>
                  <td>{UNITE_LIBELLES[categorie.unite]}</td>
                  <td>
                    {categorie.formats.length === 0 ? (
                      <span className={styles.muted}>{categorie.unite === 'unite' ? '—' : 'Aucun'}</span>
                    ) : (
                      categorie.formats.map((f) => libelleBouton(f, categorie.unite)).join(' · ')
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
              </Fragment>
            ))}
          </tbody>
        </Table>
      )}

      {edited !== undefined && <CategorieFormDialog categorie={edited} onClose={() => setEdited(undefined)} />}
      {editedSection !== undefined && <SectionFormDialog section={editedSection} onClose={() => setEditedSection(undefined)} />}

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

      <ConfirmDialog
        open={sectionToDelete !== null}
        title="Supprimer la section ?"
        confirmLabel="Supprimer"
        danger
        loading={deleteSection.isPending}
        onConfirm={confirmDeleteSection}
        onCancel={() => setSectionToDelete(null)}
      >
        La section « {sectionToDelete?.nom} » sera supprimée.
        {sectionToDelete !== null && sectionToDelete.nbCategories > 0 &&
          ` Ses ${sectionToDelete.nbCategories} catégorie(s) sont conservées, sans section.`}
      </ConfirmDialog>
    </>
  )
}

interface FlechesProps {
  nom: string
  haut: boolean
  bas: boolean
  disabled: boolean
  onMove: (delta: -1 | 1) => void
}

function Fleches({ nom, haut, bas, disabled, onMove }: FlechesProps) {
  return (
    <div className={pageStyles.order}>
      <button type="button" className={pageStyles.arrow} onClick={() => onMove(-1)} disabled={!haut || disabled} aria-label={`Monter « ${nom} »`}>
        ↑
      </button>
      <button type="button" className={pageStyles.arrow} onClick={() => onMove(1)} disabled={!bas || disabled} aria-label={`Descendre « ${nom} »`}>
        ↓
      </button>
    </div>
  )
}
