import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { BilanHeure } from '../../../api/types'
import { formatJour } from '../../../lib/dates'
import { formatKg, formatLitres, formatNombre, pluriel } from '../../../lib/format'
import styles from './bilans.module.css'
import { CHART } from './chartTheme'
import { colonnesParJour, graduations, majuscule, type Colonne } from '../../../lib/bilans'
import { InfoBulle } from './InfoBulle'

/**
 * Affluence par heure : un graphique par jour de collecte (même échelle verticale pour tous).
 */
export function ColonnesHeures({ heures }: { heures: BilanHeure[] }) {
  const parJour = colonnesParJour(heures)
  const ticks = graduations(Math.max(0, ...heures.map((h) => h.nbArticles)))

  return (
    <div className={styles.multiples}>
      {parJour.map(({ jour, colonnes }) => (
        <figure key={jour} className={styles.multiple}>
          <figcaption className={styles.multipleTitre}>{majuscule(formatJour(`${jour}T12:00:00`))}</figcaption>
          <div role="img" aria-label={`Articles collectés par heure, ${formatJour(`${jour}T12:00:00`)}`}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={colonnes} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap={2}>
                <CartesianGrid vertical={false} stroke={CHART.grille} />
                <XAxis
                  dataKey="heure"
                  tickFormatter={(h: number) => `${h}h`}
                  stroke={CHART.axe}
                  tick={{ fill: CHART.texte, fontSize: 12 }}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  domain={[0, ticks.at(-1) ?? 1]}
                  ticks={ticks}

                  tickFormatter={formatNombre}
                  width={44}
                  stroke={CHART.axe}
                  tick={{ fill: CHART.texte, fontSize: 12 }}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: CHART.grille, fillOpacity: 0.5 }}
                  content={({ active, payload }) => {
                    const c = payload?.[0]?.payload as Colonne | undefined
                    return active && c ? (
                      <InfoBulle
                        valeur={pluriel(c.nbArticles, 'article')}
                        libelle={`De ${c.heure}h à ${c.heure + 1}h`}
                        details={[formatKg(c.grammes), formatLitres(c.millilitres)]}
                      />
                    ) : null
                  }}
                />
                <Bar
                  dataKey="nbArticles"
                  fill={CHART.serie}
                  maxBarSize={CHART.barreMax}
                  radius={[CHART.arrondi, CHART.arrondi, 0, 0]}
                  activeBar={{ fill: CHART.serieSurvol }}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </figure>
      ))}
    </div>
  )
}
