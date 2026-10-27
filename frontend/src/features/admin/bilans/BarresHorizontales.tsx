import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatNombre } from '../../../lib/format'
import { graduations } from '../../../lib/bilans'
import { CHART } from './chartTheme'
import { InfoBulle } from './InfoBulle'

export interface Barre {
  cle: string | number
  libelle: string
  valeur: number
  /** Lignes complémentaires de l'infobulle (poids, volume…) */
  details?: string[]
}

export interface BarresHorizontalesProps {
  barres: Barre[]
  /** Nom de la mesure, affiché dans l'infobulle (ex. « articles ») */
  unite: string
  /** Libellé accessible du graphique */
  titre: string
}

const HAUTEUR_LIGNE = 34

/**
 * Comparaison de grandeurs (une seule série) : barres horizontales, libellés lisibles même longs,
 * valeur au bout de chaque barre. Le détail chiffré figure aussi dans le tableau qui accompagne le graphique.
 */
export function BarresHorizontales({ barres, unite, titre }: BarresHorizontalesProps) {
  // Largeur estimée des libellés (≈ 7,5 px par caractère à 13 px, plus une marge)
  const largeurLibelles = Math.min(240, Math.max(80, ...barres.map((b) => b.libelle.length * 7.5 + 16)))
  const ticks = graduations(Math.max(0, ...barres.map((b) => b.valeur)))

  return (
    <div role="img" aria-label={titre}>
      <ResponsiveContainer width="100%" height={barres.length * HAUTEUR_LIGNE + 32}>
        <BarChart data={barres} layout="vertical" margin={{ top: 4, right: 56, bottom: 4, left: 0 }} barCategoryGap={8}>
          <CartesianGrid horizontal={false} stroke={CHART.grille} />
          <XAxis
            type="number"
            domain={[0, ticks.at(-1) ?? 1]}
            ticks={ticks}
            tickFormatter={formatNombre}
            stroke={CHART.axe}
            tick={{ fill: CHART.texte, fontSize: 12 }}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="libelle"
            width={largeurLibelles}
            stroke={CHART.axe}
            tick={{ fill: CHART.texte, fontSize: 13 }}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: CHART.grille, fillOpacity: 0.5 }}
            content={({ active, payload }) => {
              const barre = payload?.[0]?.payload as Barre | undefined
              return active && barre ? (
                <InfoBulle valeur={`${formatNombre(barre.valeur)} ${unite}`} libelle={barre.libelle} details={barre.details} />
              ) : null
            }}
          />
          <Bar
            dataKey="valeur"
            fill={CHART.serie}
            maxBarSize={CHART.barreMax}
            radius={[0, CHART.arrondi, CHART.arrondi, 0]}
            activeBar={{ fill: CHART.serieSurvol }}
            isAnimationActive={false}
          >
            <LabelList dataKey="valeur" position="right" formatter={(v) => formatNombre(Number(v))} fill={CHART.texte} fontSize={12} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
