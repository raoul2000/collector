/**
 * Assemble des noms de classes CSS en ignorant les valeurs vides.
 *
 *   cx(styles.button, active && styles.active)
 */
export function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ')
}
