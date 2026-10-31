import { ApiError, request } from '../api/client'
import type { Referentiel, SyncRequest, SyncResponse } from '../api/types'
import { db, META } from '../db/db'
import { enregistrerReferentiel } from '../db/referentiel'
import { useBenevoleStore } from '../stores/benevole'
import { appliquerChangement, appliquerResultat, versEnvoi } from './merge'

/** Recherches sans résultat envoyées par échange (le serveur en accepte 100) */
const TAILLE_LOT_RECHERCHES = 100
import { useSyncStore } from './syncStore'

/**
 * Moteur de synchronisation, indépendant de React.
 *
 * Une synchronisation : met à jour le référentiel, envoie par lots les saisies à envoyer, applique les
 * résultats et les changements faits côté serveur (corrections des responsables), mémorise le curseur.
 * Elle est déclenchée au démarrage, au retour du réseau, au retour au premier plan, après chaque saisie
 * (avec un court délai) et périodiquement ; après un échec, les tentatives s'espacent.
 */

export const TAILLE_LOT = 100
/** Garde-fou : nombre maximal de lots par synchronisation */
const MAX_LOTS = 50

const DELAI_PERIODIQUE_MS = 30_000
const DELAIS_ECHEC_MS = [5_000, 10_000, 20_000, 40_000, 60_000]
const DELAI_APRES_SAISIE_MS = 1_500

let enCours: Promise<void> | null = null

/**
 * Lance une synchronisation (ou renvoie celle déjà en cours). Ne lève pas d'exception :
 * le résultat est reflété dans useSyncStore. Renvoie true si elle a réussi.
 */
export function synchroniser(): Promise<boolean> {
  enCours ??= executer().finally(() => {
    enCours = null
  })
  return enCours.then(
    () => true,
    () => false,
  )
}

async function executer(): Promise<void> {
  useSyncStore.setState({ enCours: true })
  try {
    await enregistrerReferentiel(await request<Referentiel>('referentiel'))

    const { appareilId, prenom } = useBenevoleStore.getState()
    if (prenom) {
      await envoyerSaisies(appareilId, prenom)
    }

    const now = new Date().toISOString()
    await db.meta.put({ cle: META.derniereSynchro, valeur: now })
    useSyncStore.setState({ enCours: false, enLigne: true, derniereSynchro: now, erreur: null })
  } catch (error) {
    const reseau = error instanceof ApiError && error.isNetworkError
    useSyncStore.setState({
      enCours: false,
      enLigne: !reseau,
      erreur: reseau ? null : error instanceof Error ? error.message : 'Erreur de synchronisation.',
    })
    throw error
  }
}

async function envoyerSaisies(appareilId: string, prenom: string): Promise<void> {
  for (let lot = 0; lot < MAX_LOTS; lot++) {
    const aEnvoyer = await db.saisies.where('aEnvoyer').equals(1).limit(TAILLE_LOT).toArray()
    const envoyees = aEnvoyer.map(versEnvoi)
    const curseur = (await db.meta.get(META.curseur))?.valeur ?? null
    // Les recherches sans résultat accompagnent le premier échange
    const recherches = lot === 0 ? await db.recherches.limit(TAILLE_LOT_RECHERCHES).toArray() : []

    const reponse = await request<SyncResponse>('sync', {
      method: 'POST',
      body: { prenom, curseur, saisies: envoyees, recherches } satisfies SyncRequest,
      headers: { 'X-Device-Id': appareilId },
    })

    await db.transaction('rw', db.saisies, db.meta, db.recherches, async () => {
      await db.recherches.bulkDelete(reponse.recherchesRecues ?? [])
      for (const resultat of reponse.resultats) {
        const envoyee = envoyees.find((s) => s.id === resultat.id)
        if (!envoyee) {
          continue
        }
        const nouvelle = appliquerResultat(await db.saisies.get(envoyee.id), envoyee, resultat)
        if (nouvelle) {
          await db.saisies.put(nouvelle)
        }
      }
      for (const changement of reponse.changements) {
        const nouvelle = appliquerChangement(await db.saisies.get(changement.id), changement)
        if (nouvelle) {
          await db.saisies.put(nouvelle)
        }
      }
      await db.meta.put({ cle: META.curseur, valeur: reponse.curseur })
    })

    // Lot incomplet : tout a été envoyé (les saisies modifiées pendant l'envoi partiront à la prochaine fois)
    if (aEnvoyer.length < TAILLE_LOT) {
      return
    }
  }
}

// --- Déclenchement automatique -------------------------------------------------------------------

let minuteur: ReturnType<typeof setTimeout> | undefined
let echecs = 0
let actif = false

function planifier(delai: number): void {
  clearTimeout(minuteur)
  if (actif) {
    minuteur = setTimeout(() => void cycle(), delai)
  }
}

async function cycle(): Promise<void> {
  const ok = await synchroniser()
  echecs = ok ? 0 : echecs + 1
  planifier(ok ? DELAI_PERIODIQUE_MS : DELAIS_ECHEC_MS[Math.min(echecs, DELAIS_ECHEC_MS.length) - 1]!)
}

/**
 * Demande une synchronisation prochaine (après une saisie) : les saisies rapprochées partent ensemble.
 */
export function demanderSynchro(): void {
  planifier(DELAI_APRES_SAISIE_MS)
}

/**
 * Démarre la synchronisation automatique. Renvoie la fonction d'arrêt.
 */
export function demarrerSynchro(): () => void {
  if (actif) {
    return () => {}
  }
  actif = true

  const auRetourDuReseau = () => {
    useSyncStore.setState({ enLigne: true })
    void cycle()
  }
  const horsLigne = () => useSyncStore.setState({ enLigne: false })
  const auPremierPlan = () => {
    if (document.visibilityState === 'visible') {
      void cycle()
    }
  }

  window.addEventListener('online', auRetourDuReseau)
  window.addEventListener('offline', horsLigne)
  document.addEventListener('visibilitychange', auPremierPlan)
  void db.meta.get(META.derniereSynchro).then((meta) => {
    if (meta && !useSyncStore.getState().derniereSynchro) {
      useSyncStore.setState({ derniereSynchro: meta.valeur })
    }
  })
  void cycle()

  return () => {
    actif = false
    clearTimeout(minuteur)
    window.removeEventListener('online', auRetourDuReseau)
    window.removeEventListener('offline', horsLigne)
    document.removeEventListener('visibilitychange', auPremierPlan)
  }
}
