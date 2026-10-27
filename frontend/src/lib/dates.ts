const pad = (n: number, width = 2) => String(n).padStart(width, '0')

/**
 * Date au format ISO 8601 dans le fuseau du téléphone, avec son décalage horaire
 * (ex. « 2026-11-27T10:15:00+01:00 », ou « 2026-11-27T10:15:00.123+01:00 » avec les millisecondes).
 */
export function isoLocal(date: Date, withMs = false): string {
  const offset = -date.getTimezoneOffset()
  const sign = offset >= 0 ? '+' : '-'
  const abs = Math.abs(offset)

  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}` +
    (withMs ? `.${pad(date.getMilliseconds(), 3)}` : '') +
    `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
  )
}

/**
 * Heure courte (« 10:15 ») d'une date ISO.
 */
export function formatHeure(iso: string): string {
  const date = new Date(iso)
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/**
 * Jour (« vendredi 27 novembre ») d'une date ISO.
 */
export function formatJour(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}
