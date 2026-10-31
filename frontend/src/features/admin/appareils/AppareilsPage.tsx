import { useState } from 'react'
import { Link } from 'react-router'
import { Alert } from '../../../components/Alert'
import { Badge } from '../../../components/Badge'
import { Select } from '../../../components/Select'
import { Table } from '../../../components/Table'
import { formatNombre } from '../../../lib/format'
import styles from '../admin.module.css'
import { BILAN_REFRESH_MS, useAppareils, useCampagnes, useMagasins } from '../api'
import { PageHeader } from '../PageHeader'
import { nomMagasin } from '../saisies/magasins'
import pageStyles from './AppareilsPage.module.css'
import { derniereSynchro, moment } from './temps'

/**
 * Téléphones des bénévoles d'une campagne : qui saisit, où, et quand chacun s'est synchronisé pour la dernière fois.
 */
export function AppareilsPage() {
  const campagnes = useCampagnes()
  const magasins = useMagasins()
  const [campagne, setCampagne] = useState<number>()
  const liste = useAppareils(campagne)
  const data = liste.data

  const magasin = (id: number | null) => {
    const m = id === null ? undefined : magasins.data?.find((mag) => mag.id === id)
    return m ? nomMagasin(m) : '—'
  }

  return (
    <>
      <PageHeader
        title="Appareils"
        description={`Téléphones des bénévoles. Actualisé automatiquement toutes les ${BILAN_REFRESH_MS / 1000} secondes.`}
      />

      <div className={pageStyles.filtres}>
        <Select
          label="Campagne"
          value={campagne ?? data?.campagne.id ?? ''}
          onChange={(e) => setCampagne(e.target.value === '' ? undefined : Number(e.target.value))}
        >
          {!data && <option value="">Campagne active</option>}
          {campagnes.data?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nom}
              {c.active ? ' (active)' : ''}
            </option>
          ))}
        </Select>
      </div>

      {liste.isPending && <p className={styles.loading}>Chargement…</p>}
      {liste.isError && (
        <Alert kind={liste.error.message === 'Aucune campagne active.' ? 'warning' : 'error'}>
          {liste.error.message === 'Aucune campagne active.'
            ? 'Aucune campagne n\'est active : choisissez une campagne.'
            : liste.error.message}
        </Alert>
      )}

      {data && (
        <>
          <p className={pageStyles.aide}>
            Tant que l'application est ouverte et que le téléphone a du réseau, il se synchronise toutes les 30 secondes :
            « Connecté » signifie une synchronisation il y a moins de {data.connecteMinutes} min. Un téléphone fermé
            entre deux créneaux est normal.
          </p>
          <Table>
            <thead>
              <tr>
                <th>Bénévole</th>
                <th>Appareil</th>
                <th>Magasin</th>
                <th className={styles.numeric}>Saisies</th>
                <th className={styles.numeric}>Articles</th>
                <th>Dernière saisie</th>
                <th>Dernière synchro</th>
                <th>
                  <span className="visually-hidden">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.appareils.length === 0 && (
                <tr>
                  <td colSpan={8} className={styles.empty}>
                    Aucun appareil pour cette campagne.
                  </td>
                </tr>
              )}
              {data.appareils.map((a) => (
                <tr key={a.id}>
                  <td>{a.prenom}</td>
                  <td className={pageStyles.code} title={a.id}>
                    {a.id.slice(0, 8)}
                  </td>
                  <td>{magasin(a.magasinId)}</td>
                  <td className={styles.numeric}>{formatNombre(a.nbSaisies)}</td>
                  <td className={styles.numeric}>{formatNombre(a.nbArticles)}</td>
                  <td>{a.derniereSaisie ? moment(a.derniereSaisie) : '—'}</td>
                  <td className={pageStyles.synchro}>
                    {a.connecte ? <Badge kind="success">Connecté</Badge> : derniereSynchro(a)}
                  </td>
                  <td>
                    {a.nbSaisies > 0 && (
                      <Link
                        className={pageStyles.lien}
                        to={`/admin/saisies?campagne=${data.campagne.id}&appareil=${a.id}`}
                        aria-label={`Voir les saisies de ${a.prenom} (appareil ${a.id.slice(0, 8)})`}
                      >
                        Voir ses saisies
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </>
      )}
    </>
  )
}
