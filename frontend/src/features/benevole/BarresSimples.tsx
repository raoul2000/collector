import { cx } from '../../lib/cx'
import styles from './BarresSimples.module.css'

export interface BarreSimple {
  cle: string | number
  libelle: string
  /** Valeur affichée et représentée */
  valeur: number
  valeurTexte: string
  /** Précision sous le libellé (ex. « 12,5 kg ») */
  detail?: string
  /** Mise en avant (les autres barres passent en gris) */
  enAvant?: boolean
}

/**
 * Barres horizontales légères (HTML/CSS) pour le téléphone : libellé et valeur au-dessus de la barre,
 * lisibles sans survol.
 */
export function BarresSimples({ barres, titre, rang = false }: { barres: BarreSimple[]; titre: string; rang?: boolean }) {
  const maximum = Math.max(1, ...barres.map((b) => b.valeur))
  const miseEnAvant = barres.some((b) => b.enAvant)

  return (
    <ol className={styles.liste} aria-label={titre}>
      {barres.map((barre, index) => (
        <li key={barre.cle} className={cx(styles.ligne, barre.enAvant && styles.enAvant)}>
          <div className={styles.texte}>
            <span className={styles.libelle}>
              {rang && <span className={styles.rang}>{index + 1}</span>}
              {barre.libelle}
            </span>
            <span className={styles.valeur}>{barre.valeurTexte}</span>
          </div>
          {barre.detail && <span className={styles.detail}>{barre.detail}</span>}
          <div className={styles.piste} aria-hidden="true">
            <div
              className={cx(styles.barre, miseEnAvant && !barre.enAvant && styles.attenuee)}
              style={{ width: `${(barre.valeur / maximum) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ol>
  )
}
