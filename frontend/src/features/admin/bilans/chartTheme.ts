/**
 * Couleurs des graphiques Recharts (appliquées en attributs SVG, où les variables CSS ne sont pas fiables).
 * Mêmes valeurs que les variables --chart-* de styles/theme.css.
 */
export const CHART = {
  serie: '#2a78d6',
  serieSurvol: '#1c5cab',
  grille: '#e6e3df',
  axe: '#8a847d',
  texte: '#595959',
  surface: '#ffffff',
  /** Épaisseur maximale d'une barre */
  barreMax: 24,
  /** Arrondi de l'extrémité des barres (côté valeur uniquement) */
  arrondi: 4,
} as const
