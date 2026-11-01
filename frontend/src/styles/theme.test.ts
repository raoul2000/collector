import { describe, expect, it } from 'vitest'
import css from './theme.css?raw'

/** Variables des blocs de theme.css portant ce sélecteur */
function variables(selecteur: string): Record<string, string> {
  const blocs = css.split(`${selecteur} {`).slice(1).map((suite) => suite.slice(0, suite.indexOf('}')))
  return Object.fromEntries(blocs.flatMap((bloc) => [...bloc.matchAll(/(--[\w-]+):\s*(#[0-9a-f]{6})/g)].map((m) => [m[1]!, m[2]!])))
}

function luminance(hex: string): number {
  const canaux = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const [r, g, b] = canaux.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!
}

function contraste(a: string, b: string): number {
  const [clair, sombre] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (clair! + 0.05) / (sombre! + 0.05)
}

const STANDARD = variables(':root')
const THEMES = { standard: STANDARD, sombre: { ...STANDARD, ...variables(":root[data-theme='sombre']") } }

/** Texte, fond : contraste WCAG AA pour un texte courant (4,5:1) */
const TEXTES: [string, string][] = [
  ['--color-text', '--color-bg'],
  ['--color-text', '--color-surface'],
  ['--color-text', '--color-surface-muted'],
  ['--color-text-muted', '--color-bg'],
  ['--color-text-muted', '--color-surface'],
  ['--color-primary', '--color-bg'],
  ['--color-primary', '--color-surface'],
  ['--color-primary', '--color-primary-soft'],
  ['--color-text', '--color-primary-soft'],
  ['--color-text-muted', '--color-primary-soft'],
  ['--color-on-primary', '--color-primary-fill'],
  ['--color-on-fill', '--color-success-fill'],
  ['--color-on-fill', '--color-danger-fill'],
  ['--color-on-fill', '--color-info-fill'],
  ['--color-success', '--color-success-soft'],
  ['--color-warning', '--color-warning-soft'],
  ['--color-danger', '--color-danger-soft'],
  ['--color-info', '--color-info-soft'],
  ['--color-text', '--color-success-soft'],
  ['--color-text', '--color-warning-soft'],
  ['--color-text', '--color-danger-soft'],
  ['--color-text', '--color-info-soft'],
  ['--color-danger', '--color-surface'],
  ['--color-info', '--color-bg'],
]

/** Éléments graphiques et contours utiles : 3:1 */
const GRAPHIQUES: [string, string][] = [
  ['--color-border-strong', '--color-surface'],
  ['--color-focus', '--color-surface'],
  ['--chart-series-1', '--chart-surface'],
]

describe.each(Object.entries(THEMES))('Thème %s', (_nom, couleurs) => {
  it.each(TEXTES)('%s lisible sur %s', (texte, fond) => {
    expect(contraste(couleurs[texte]!, couleurs[fond]!)).toBeGreaterThanOrEqual(4.5)
  })

  it.each(GRAPHIQUES)('%s visible sur %s', (element, fond) => {
    expect(contraste(couleurs[element]!, couleurs[fond]!)).toBeGreaterThanOrEqual(3)
  })
})

describe('Voyant de synchronisation (thème sombre)', () => {
  it.each(['--color-success', '--color-warning', '--color-danger', '--color-info'])('%s lisible', (couleur) => {
    expect(contraste(THEMES.sombre[couleur]!, THEMES.sombre['--color-indicateur']!)).toBeGreaterThanOrEqual(4.5)
  })
})
