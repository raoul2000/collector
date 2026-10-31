/**
 * Calcul d'un déploiement : quels fichiers du paquet envoyer, dans quel ordre, et lesquels supprimer.
 *
 * Le serveur garde la liste des fichiers déposés lors du déploiement précédent (manifeste, avec l'empreinte
 * de chaque fichier) : seuls les fichiers nouveaux ou modifiés sont envoyés, seuls ceux qui ont disparu du
 * paquet sont supprimés. Les fichiers propres au serveur (configuration, journaux) ne figurent jamais dans
 * le paquet et ne sont donc jamais touchés.
 */
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

/** Dossiers du paquet déposés sur le serveur */
export const DOSSIERS = ['app', 'www']

/** Emplacement du manifeste sur le serveur (var/ n'est jamais dans le paquet) */
export const MANIFESTE = 'app/var/deploiement.json'

/** Chemins du serveur que l'outil ne doit ni écraser ni supprimer */
const PROTEGES = [/^app\/config\/config\.php$/, /^app\/var\//]

/** Anciens fichiers compilés : gardés jusqu'au déploiement suivant pour les pages déjà ouvertes */
const ASSETS = /^www\/assets\//

/**
 * Empreinte SHA-256 de chaque fichier de app/ et www/ du paquet, chemins relatifs en notation « / ».
 *
 * @param {string} paquet dossier deploy/package
 * @returns {Record<string, string>}
 */
export function manifesteLocal(paquet) {
  /** @type {Record<string, string>} */
  const fichiers = {}
  for (const dossier of DOSSIERS) {
    for (const entree of readdirSync(join(paquet, dossier), { recursive: true, withFileTypes: true })) {
      if (!entree.isFile()) continue
      const chemin = join(entree.parentPath, entree.name)
      fichiers[relative(paquet, chemin).split(sep).join('/')] = empreinte(readFileSync(chemin))
    }
  }
  return trier(fichiers)
}

/**
 * @param {Buffer | string} contenu
 */
export function empreinte(contenu) {
  return createHash('sha256').update(contenu).digest('hex')
}

/**
 * @typedef {{ version?: string, date?: string, fichiers: Record<string, string>, anciens: string[] }} Manifeste
 * @typedef {{ api: string[], interface: string[], supprimer: string[], manifeste: Manifeste }} Plan
 */

/**
 * Fichiers à envoyer (en deux temps : l'API, puis l'interface) et à supprimer.
 * Sans manifeste sur le serveur (premier déploiement avec l'outil), tout est envoyé et rien n'est supprimé.
 *
 * @param {Record<string, string>} local
 * @param {Manifeste | null} distant
 * @param {{ version?: string, date?: string }} [infos]
 * @returns {Plan}
 */
export function planifier(local, distant, infos = {}) {
  for (const chemin of Object.keys(local)) {
    if (estProtege(chemin)) throw new Error(`Le paquet ne doit pas contenir ${chemin}.`)
  }
  const precedents = distant?.fichiers ?? {}
  const envoyer = Object.keys(local).filter((chemin) => precedents[chemin] !== local[chemin])
  const disparus = Object.keys(precedents).filter((chemin) => !(chemin in local) && !estProtege(chemin))

  const anciens = disparus.filter((chemin) => ASSETS.test(chemin))
  const supprimer = [
    ...disparus.filter((chemin) => !ASSETS.test(chemin)),
    ...(distant?.anciens ?? []).filter((chemin) => !(chemin in local) && !estProtege(chemin)),
  ]

  return {
    api: envoyer.filter((chemin) => chemin.startsWith('app/')).sort(),
    interface: envoyer.filter((chemin) => chemin.startsWith('www/')).sort((a, b) => rang(a) - rang(b) || a.localeCompare(b)),
    supprimer: [...new Set(supprimer)].sort(),
    manifeste: { ...infos, fichiers: local, anciens: anciens.sort() },
  }
}

/**
 * Ordre de dépôt de l'interface : le point d'entrée de l'API, les fichiers compilés, puis le service worker
 * et enfin index.html. Un navigateur ne charge ainsi jamais une page qui référence des fichiers absents.
 *
 * @param {string} chemin
 */
function rang(chemin) {
  if (chemin.startsWith('www/api/')) return 0
  if (chemin === 'www/sw.js') return 2
  if (chemin === 'www/index.html') return 3
  return 1
}

/**
 * @param {string} chemin
 */
function estProtege(chemin) {
  return PROTEGES.some((motif) => motif.test(chemin))
}

/**
 * @param {Record<string, string>} fichiers
 */
function trier(fichiers) {
  return Object.fromEntries(Object.entries(fichiers).sort(([a], [b]) => a.localeCompare(b)))
}
