import type { AppareilAdmin } from '../../../api/types'

const heure = (iso: string) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

const memeJour = (a: Date, b: Date) => a.toDateString() === b.toDateString()

/** « à 10:41 » le jour même, sinon « le 27/11 à 10:41 » */
export function moment(iso: string, maintenant = new Date()): string {
  const date = new Date(iso)
  if (memeJour(date, maintenant)) {
    return `à ${heure(iso)}`
  }
  return `le ${date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} à ${heure(iso)}`
}

/**
 * Dernière synchronisation : « Connecté », « il y a 35 min », puis l'heure. Le temps écoulé est calculé
 * par le serveur (l'horloge de l'ordinateur du responsable peut être décalée).
 */
export function derniereSynchro(appareil: Pick<AppareilAdmin, 'connecte' | 'vuIlYaSecondes' | 'vuLe'>): string {
  if (appareil.connecte) {
    return 'Connecté'
  }
  const minutes = Math.floor(appareil.vuIlYaSecondes / 60)
  if (minutes < 1) {
    return 'il y a moins d\'une minute'
  }
  if (minutes < 60) {
    return `il y a ${minutes} min`
  }
  return moment(appareil.vuLe)
}
