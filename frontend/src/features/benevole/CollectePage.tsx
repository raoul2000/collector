import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../api/client'
import type { BilanPublic } from '../../api/types'
import { Alert } from '../../components/Alert'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { StatRow, StatTile } from '../../components/StatTile'
import { formatKg, formatLitres, formatNombre, pluriel } from '../../lib/format'
import { mentionSansContenance, totalContenance } from '../../lib/bilans'
import { BarresSimples } from './BarresSimples'
import styles from './benevole.module.css'
import { useBenevole } from './context'

/** Actualisation pendant que l'écran est affiché */
const REFRESH_MS = 60_000

/** Catégories affichées avant « Voir les autres » (écran de téléphone) */
const CATEGORIES_VISIBLES = 6

/**
 * « Notre collecte » : chiffres du magasin, total général et classement des magasins, pour motiver
 * les bénévoles. Nécessite le réseau (les derniers chiffres reçus restent affichés hors ligne).
 */
export function CollectePage() {
  const { magasin } = useBenevole()
  const [toutesCategories, setToutesCategories] = useState(false)
  const bilan = useQuery({
    queryKey: ['bilans', magasin.id],
    queryFn: ({ signal }) => api.get<BilanPublic>(`bilans?magasin=${magasin.id}`, signal),
    refetchInterval: REFRESH_MS,
  })

  const data = bilan.data
  const horsLigne = bilan.isError

  return (
    <div className={styles.stack}>
      <h1 className={styles.title}>Notre collecte</h1>

      {horsLigne && (
        <Alert kind="warning">
          {data
            ? 'Pas de connexion : les chiffres affichés ne sont peut-être plus à jour.'
            : 'Les chiffres de la collecte s\'affichent quand le téléphone est connecté.'}
        </Alert>
      )}
      {bilan.isPending && <p className={styles.muted}>Chargement…</p>}
      {data && data.campagne === null && <Alert kind="info">Aucune collecte n'est en cours.</Alert>}

      {data && data.campagne !== null && (
        <>
          <section className={styles.section} aria-labelledby="notre-magasin">
            <h2 id="notre-magasin" className={styles.sectionTitle}>
              {magasin.nom}
            </h2>
            <StatRow>
              <StatTile hero label="Articles collectés" value={formatNombre(data.magasin?.totaux.nbArticles ?? 0)} />
              <StatTile label="Poids" value={formatKg(data.magasin?.totaux.grammes ?? 0)} />
              <StatTile label="Volume" value={formatLitres(data.magasin?.totaux.millilitres ?? 0)} />
            </StatRow>
          </section>

          {data.magasin && data.magasin.categories.length > 0 && (
            <Card title="Ce que nous avons collecté">
              <BarresSimples
                titre="Articles collectés par catégorie dans notre magasin"
                barres={[...data.magasin.categories]
                  .sort((a, b) => b.nbArticles - a.nbArticles)
                  .slice(0, toutesCategories ? undefined : CATEGORIES_VISIBLES)
                  .map((c) => ({
                    cle: c.categorieId,
                    libelle: c.nom,
                    valeur: c.nbArticles,
                    valeurTexte: pluriel(c.nbArticles, 'article'),
                    detail: [totalContenance(c), mentionSansContenance(c)].filter(Boolean).join(' · ') || undefined,
                  }))}
              />
              {data.magasin.categories.length > CATEGORIES_VISIBLES && (
                <Button variant="ghost" block className={styles.voirTout} onClick={() => setToutesCategories((v) => !v)}>
                  {toutesCategories
                    ? 'Voir moins'
                    : `Voir les ${data.magasin.categories.length - CATEGORIES_VISIBLES} autres catégories`}
                </Button>
              )}
            </Card>
          )}

          <Card title="Tous les magasins">
            <div className={styles.section}>
              <p>
                Ensemble, nous avons collecté <strong>{pluriel(data.general.nbArticles, 'article')}</strong>, soit{' '}
                <strong>{formatKg(data.general.grammes)}</strong> et <strong>{formatLitres(data.general.millilitres)}</strong>.
              </p>
              <BarresSimples
                rang
                titre="Classement des magasins par nombre d'articles"
                barres={data.classement.map((m) => ({
                  cle: m.magasinId,
                  libelle: m.nom,
                  valeur: m.nbArticles,
                  valeurTexte: formatNombre(m.nbArticles),
                  detail: `${formatKg(m.grammes)} · ${formatLitres(m.millilitres)}`,
                  enAvant: m.magasinId === magasin.id,
                }))}
              />
            </div>
          </Card>

          <p className={styles.muted}>Chiffres de la collecte « {data.campagne.nom} », actualisés chaque minute.</p>
        </>
      )}
    </div>
  )
}
