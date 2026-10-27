import { useState } from 'react'
import { Alert } from '../../../components/Alert'
import { Card } from '../../../components/Card'
import { Select } from '../../../components/Select'
import { StatRow, StatTile } from '../../../components/StatTile'
import { Table } from '../../../components/Table'
import { formatDate, formatKg, formatLitres, formatNombre, pluriel } from '../../../lib/format'
import adminStyles from '../admin.module.css'
import { BILAN_REFRESH_MS, useBilan, useCampagnes, useMagasins } from '../api'
import { PageHeader } from '../PageHeader'
import { BarresHorizontales } from './BarresHorizontales'
import styles from './bilans.module.css'
import { ColonnesHeures } from './ColonnesHeures'
import { colonnesParJour, mentionSansContenance, totalContenance } from '../../../lib/bilans'

const heure = (date: Date) => date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

/**
 * Bilans de la collecte : chiffres clés, par catégorie, par heure et par magasin.
 * Actualisés automatiquement pendant la collecte.
 */
export function BilansPage() {
  const campagnes = useCampagnes()
  const magasins = useMagasins()
  const [campagne, setCampagne] = useState<number>()
  const [magasin, setMagasin] = useState<number>()
  const bilan = useBilan(campagne, magasin)

  const nombre = (valeur: string) => (valeur === '' ? undefined : Number(valeur))
  const data = bilan.data
  const nomMagasin = magasins.data?.find((m) => m.id === magasin)?.nom

  return (
    <div className={styles.page}>
      <PageHeader
        title="Bilans"
        description={`Actualisés automatiquement toutes les ${BILAN_REFRESH_MS / 1000} secondes.`}
      />

      <div className={styles.filtres}>
        <Select
          label="Campagne"
          value={campagne ?? data?.campagne.id ?? ''}
          onChange={(e) => setCampagne(nombre(e.target.value))}
        >
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

      {bilan.isPending && <p className={adminStyles.loading}>Chargement…</p>}
      {bilan.isError && (
        <Alert kind={bilan.error.message === 'Aucune campagne active.' ? 'warning' : 'error'}>
          {bilan.error.message === 'Aucune campagne active.'
            ? 'Aucune campagne n\'est active : choisissez une campagne pour consulter son bilan.'
            : bilan.error.message}
        </Alert>
      )}

      {data && (
        <div className={bilan.isPlaceholderData ? styles.rechargement : styles.page}>
          <p className={styles.miseAJour}>
            {data.campagne.nom} · du {formatDate(data.campagne.dateDebut)} au {formatDate(data.campagne.dateFin)}
            {nomMagasin && ` · ${nomMagasin}`} · mis à jour à {heure(new Date(bilan.dataUpdatedAt))}
          </p>

          <StatRow>
            <StatTile hero label="Articles collectés" value={formatNombre(data.totaux.nbArticles)} detail={pluriel(data.totaux.nbSaisies, 'saisie')} />
            <StatTile
              label="Poids"
              value={formatKg(data.totaux.grammes)}
              detail={data.totaux.sansContenance > 0 ? `${pluriel(data.totaux.sansContenance, 'article')} sans poids ni volume` : undefined}
            />
            <StatTile label="Volume" value={formatLitres(data.totaux.millilitres)} />
          </StatRow>

          <Card title="Par catégorie">
            {data.categories.length === 0 ? (
              <p className={styles.vide}>Aucune saisie pour l'instant.</p>
            ) : (
              <>
                <BarresHorizontales
                  titre="Articles collectés par catégorie"
                  unite="articles"
                  barres={[...data.categories].sort((a, b) => b.nbArticles - a.nbArticles).map((c) => ({
                    cle: c.categorieId,
                    libelle: c.nom,
                    valeur: c.nbArticles,
                    details: [totalContenance(c), mentionSansContenance(c)].filter((d): d is string => d !== null),
                  }))}
                />
                <details className={styles.tableau}>
                  <summary>Voir le tableau</summary>
                  <Table>
                    <thead>
                      <tr>
                        <th>Catégorie</th>
                        <th className={adminStyles.numeric}>Articles</th>
                        <th className={adminStyles.numeric}>Poids / volume</th>
                        <th className={adminStyles.numeric}>Saisies</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.categories.map((c) => (
                        <tr key={c.categorieId}>
                          <td>{c.nom}</td>
                          <td className={adminStyles.numeric}>{formatNombre(c.nbArticles)}</td>
                          <td className={adminStyles.numeric}>
                            {totalContenance(c) ?? '—'}
                            {mentionSansContenance(c) && <div className={adminStyles.muted}>{mentionSansContenance(c)}</div>}
                          </td>
                          <td className={adminStyles.numeric}>{formatNombre(c.nbSaisies)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </details>
              </>
            )}
          </Card>

          <Card title="Par heure">
            {data.heures.length === 0 ? (
              <p className={styles.vide}>Aucune saisie pour l'instant.</p>
            ) : (
              <>
                <ColonnesHeures heures={data.heures} />
                <details className={styles.tableau}>
                  <summary>Voir le tableau</summary>
                  <Table>
                    <thead>
                      <tr>
                        <th>Jour</th>
                        <th>Heure</th>
                        <th className={adminStyles.numeric}>Articles</th>
                        <th className={adminStyles.numeric}>Poids</th>
                        <th className={adminStyles.numeric}>Volume</th>
                      </tr>
                    </thead>
                    <tbody>
                      {colonnesParJour(data.heures).flatMap(({ jour, colonnes }) =>
                        colonnes
                          .filter((c) => c.nbArticles > 0)
                          .map((c) => (
                            <tr key={`${jour}-${c.heure}`}>
                              <td>{formatDate(jour)}</td>
                              <td>
                                {c.heure}h – {c.heure + 1}h
                              </td>
                              <td className={adminStyles.numeric}>{formatNombre(c.nbArticles)}</td>
                              <td className={adminStyles.numeric}>{formatKg(c.grammes)}</td>
                              <td className={adminStyles.numeric}>{formatLitres(c.millilitres)}</td>
                            </tr>
                          )),
                      )}
                    </tbody>
                  </Table>
                </details>
              </>
            )}
          </Card>

          {magasin === undefined && data.magasins.length > 0 && (
            <Card title="Par magasin">
              <BarresHorizontales
                titre="Articles collectés par magasin"
                unite="articles"
                barres={data.magasins.map((m) => ({
                  cle: m.magasinId,
                  libelle: m.nom,
                  valeur: m.nbArticles,
                  details: [formatKg(m.grammes), formatLitres(m.millilitres)],
                }))}
              />
              <details className={styles.tableau}>
                <summary>Voir le tableau</summary>
                <Table>
                  <thead>
                    <tr>
                      <th>Magasin</th>
                      <th className={adminStyles.numeric}>Articles</th>
                      <th className={adminStyles.numeric}>Poids</th>
                      <th className={adminStyles.numeric}>Volume</th>
                      <th className={adminStyles.numeric}>Saisies</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.magasins.map((m) => (
                      <tr key={m.magasinId}>
                        <td>{[m.nom, m.ville].filter(Boolean).join(' – ')}</td>
                        <td className={adminStyles.numeric}>{formatNombre(m.nbArticles)}</td>
                        <td className={adminStyles.numeric}>{formatKg(m.grammes)}</td>
                        <td className={adminStyles.numeric}>{formatLitres(m.millilitres)}</td>
                        <td className={adminStyles.numeric}>{formatNombre(m.nbSaisies)}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </details>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
