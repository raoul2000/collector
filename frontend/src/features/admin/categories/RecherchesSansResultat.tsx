import { useState } from 'react'
import type { Categorie, RechercheGroupee } from '../../../api/types'
import { Alert } from '../../../components/Alert'
import { Button } from '../../../components/Button'
import { Card } from '../../../components/Card'
import { Table } from '../../../components/Table'
import { toast } from '../../../components/toast'
import styles from '../admin.module.css'
import { useAjouterMotCle, useIgnorerRecherche, useRecherches } from '../api'
import { moment } from '../appareils/temps'
import { handleMutationError } from '../errors'
import pageStyles from './CategoriesPage.module.css'

/**
 * Mots cherchés par les bénévoles sans trouver de catégorie (campagne active) : à ajouter aux mots-clés de la
 * catégorie choisie ensuite, ou à ignorer.
 */
export function RecherchesSansResultat({ categories }: { categories: Categorie[] }) {
  const recherches = useRecherches()

  if (recherches.isPending || recherches.data === null) {
    return null
  }

  return (
    <Card title="Recherches sans résultat" className={pageStyles.sections}>
      <p className={styles.muted}>
        Mots tapés par les bénévoles dans la recherche sans trouver de catégorie
        {recherches.data ? ` (${recherches.data.campagne.nom})` : ''}. Ajoutez-les aux mots-clés de la bonne catégorie
        pour que la prochaine recherche aboutisse.
      </p>
      {recherches.isError && <Alert kind="error">{recherches.error.message}</Alert>}
      {recherches.data?.recherches.length === 0 && <p className={styles.muted}>Aucune pour l'instant.</p>}
      {recherches.data && recherches.data.recherches.length > 0 && (
        <Table>
          <thead>
            <tr>
              <th>Mot cherché</th>
              <th className={styles.numeric}>Fois</th>
              <th>Dernière</th>
              <th>Ajouter aux mots-clés de</th>
              <th>
                <span className="visually-hidden">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {recherches.data.recherches.map((r) => (
              <Ligne key={r.terme} recherche={r} categories={categories} />
            ))}
          </tbody>
        </Table>
      )}
    </Card>
  )
}

function Ligne({ recherche, categories }: { recherche: RechercheGroupee; categories: Categorie[] }) {
  const ajouter = useAjouterMotCle()
  const ignorer = useIgnorerRecherche()
  // Par défaut, la catégorie que les bénévoles ont le plus souvent choisie ensuite
  const [categorieId, setCategorieId] = useState<number | ''>(recherche.categorie?.id ?? '')

  const ajouterMotCle = () => {
    if (categorieId === '') {
      return
    }
    ajouter.mutate(
      { terme: recherche.terme, categorieId },
      {
        onSuccess: (categorie) => toast.success(`« ${recherche.terme} » ajouté aux mots-clés de « ${categorie.nom} ».`),
        onError: (error) => handleMutationError(error),
      },
    )
  }

  return (
    <tr>
      <td>
        <strong>{recherche.terme}</strong>
      </td>
      <td className={styles.numeric}>{recherche.nombre}</td>
      <td>{moment(recherche.derniere)}</td>
      <td>
        <div className={pageStyles.ajoutMotCle}>
          <label className="visually-hidden" htmlFor={`categorie-${recherche.terme}`}>
            Catégorie pour « {recherche.terme} »
          </label>
          <select
            id={`categorie-${recherche.terme}`}
            className={pageStyles.selectCategorie}
            value={categorieId}
            onChange={(e) => setCategorieId(e.target.value === '' ? '' : Number(e.target.value))}
          >
            <option value="">Choisir une catégorie…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nom}
              </option>
            ))}
          </select>
          <Button size="sm" onClick={ajouterMotCle} disabled={categorieId === ''} loading={ajouter.isPending}>
            Ajouter
          </Button>
        </div>
      </td>
      <td>
        <Button
          size="sm"
          variant="ghost"
          loading={ignorer.isPending}
          onClick={() => ignorer.mutate(recherche.terme, { onError: (error) => handleMutationError(error) })}
          aria-label={`Ignorer « ${recherche.terme} »`}
        >
          Ignorer
        </Button>
      </td>
    </tr>
  )
}
