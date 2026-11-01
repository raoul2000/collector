import { useState } from 'react'
import { Link } from 'react-router'
import { Alert } from '../../../components/Alert'
import { Button } from '../../../components/Button'
import { Card } from '../../../components/Card'
import { Select } from '../../../components/Select'
import { StatRow, StatTile } from '../../../components/StatTile'
import { Table } from '../../../components/Table'
import { toast } from '../../../components/toast'
import { formatNombre, pluriel } from '../../../lib/format'
import adminStyles from '../admin.module.css'
import { useCampagnes, useMagasins, useReceptionAida } from '../api'
import { handleMutationError } from '../errors'
import { PageHeader } from '../PageHeader'
import styles from './bilans.module.css'
import { exporterReceptionAida } from './exportExcel'

/**
 * Réception AÏDA : nombre d'articles à ressaisir par code, à imprimer ou à exporter.
 */
export function ReceptionAidaPage() {
  const campagnes = useCampagnes()
  const magasins = useMagasins()
  const [campagne, setCampagne] = useState<number>()
  const [magasin, setMagasin] = useState<number>()
  const reception = useReceptionAida(campagne, magasin)
  const [exportEnCours, setExportEnCours] = useState(false)

  const nombre = (valeur: string) => (valeur === '' ? undefined : Number(valeur))
  const data = reception.data
  const nomMagasin = magasins.data?.find((m) => m.id === magasin)?.nom
  const aucuneCampagne = reception.error?.message === 'Aucune campagne active.'

  const exporter = async () => {
    if (!data) return
    setExportEnCours(true)
    try {
      await exporterReceptionAida(data, nomMagasin)
      toast.success('Réception AÏDA exportée.')
    } catch (error) {
      handleMutationError(error)
    } finally {
      setExportEnCours(false)
    }
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title="Réception AÏDA"
        description="Nombre d'articles à saisir dans AÏDA pour chaque code."
        actions={
          data && (
            <div className={styles.actions}>
              <Button variant="secondary" onClick={() => window.print()}>
                Imprimer
              </Button>
              <Button variant="secondary" loading={exportEnCours} onClick={() => void exporter()}>
                Exporter (Excel)
              </Button>
            </div>
          )
        }
      />

      <Link to="/admin/bilans" className={styles.lien}>
        ← Retour aux bilans
      </Link>

      <div className={styles.filtres}>
        <Select label="Campagne" value={campagne ?? data?.campagne.id ?? ''} onChange={(e) => setCampagne(nombre(e.target.value))}>
          {!data && <option value="">Campagne active</option>}
          {campagnes.data?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nom}
              {c.active ? ' (active)' : ''}
            </option>
          ))}
        </Select>
        <Select label="Magasin" value={magasin ?? ''} onChange={(e) => setMagasin(nombre(e.target.value))}>
          <option value="">Tous les magasins</option>
          {magasins.data?.map((m) => (
            <option key={m.id} value={m.id}>
              {[m.nom, m.ville].filter(Boolean).join(' – ')}
            </option>
          ))}
        </Select>
      </div>

      {reception.isPending && <p className={adminStyles.loading}>Chargement…</p>}
      {reception.isError && (
        <Alert kind={aucuneCampagne ? 'warning' : 'error'}>
          {aucuneCampagne ? 'Aucune campagne n\'est active : choisissez une campagne.' : reception.error.message}
        </Alert>
      )}

      {data && (
        <div className={reception.isPlaceholderData ? styles.rechargement : styles.page}>
          <p className={styles.miseAJour}>
            {data.campagne.nom}
            {nomMagasin ? ` · ${nomMagasin}` : ' · Tous les magasins'}
          </p>

          <StatRow>
            <StatTile hero label="Articles" value={formatNombre(data.totaux.nbArticles)} />
            <StatTile label="À vérifier" value={formatNombre(data.totaux.aVerifier)} detail="Code déduit de la contenance" />
            <StatTile label="Non rapprochés" value={formatNombre(data.totaux.nonRapproches)} detail="Sans code AÏDA" />
          </StatRow>

          <p className={styles.miseAJour}>
            Chiffres déclarés par les bénévoles, à contrôler par rapport à ce qui est reçu à l'entrepôt.
          </p>

          <Card title="Articles à saisir">
            {data.articles.length === 0 ? (
              <p className={styles.vide}>Aucun article rapproché.</p>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <th>Code AÏDA</th>
                    <th>Produit</th>
                    <th className={adminStyles.numeric}>Articles</th>
                    <th className={adminStyles.numeric}>Dont à vérifier</th>
                  </tr>
                </thead>
                <tbody>
                  {data.articles.map((a) => (
                    <tr key={a.code}>
                      <td>{a.code}</td>
                      <td>{a.libelles.join(', ')}</td>
                      <td className={adminStyles.numeric}>{formatNombre(a.nbArticles)}</td>
                      <td className={adminStyles.numeric}>{a.aVerifier > 0 ? formatNombre(a.aVerifier) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>

          {data.nonRapprochees.length > 0 && (
            <Card title="Non rapprochés">
              <p className={styles.miseAJour}>Ces articles n'ont pas de code : à classer à la main.</p>
              <Table>
                <thead>
                  <tr>
                    <th>Catégorie</th>
                    <th className={adminStyles.numeric}>Articles</th>
                    <th className={adminStyles.numeric}>Saisies</th>
                  </tr>
                </thead>
                <tbody>
                  {data.nonRapprochees.map((c) => (
                    <tr key={c.categorieId}>
                      <td>{c.nom}</td>
                      <td className={adminStyles.numeric}>{formatNombre(c.nbArticles)}</td>
                      <td className={adminStyles.numeric}>{pluriel(c.nbSaisies, 'saisie')}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
