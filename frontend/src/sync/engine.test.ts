import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Referentiel, SaisieServeur, SyncRequest } from '../api/types'
import { db, META } from '../db/db'
import { creerSaisie } from '../db/saisies'
import { useBenevoleStore } from '../stores/benevole'
import { fakeApi, type FakeRoute } from '../test/fakeApi'
import { synchroniser, TAILLE_LOT } from './engine'
import { useSyncStore } from './syncStore'

const APPAREIL = '11111111-1111-4111-8111-111111111111'
const REFERENTIEL: Referentiel = { campagne: null, magasins: [], categories: [], version: 'v1' }
const NOUVELLE = { campagneId: 1, magasinId: 2, categorieId: 3, quantite: 2, contenanceUnitaire: 500 }

/** Faux serveur de synchronisation : accepte tout et renvoie la saisie telle qu'enregistrée */
function serveurQuiAccepte(changements: SaisieServeur[] = []): FakeRoute {
  return (body) => {
    const { saisies } = body as SyncRequest
    return {
      body: {
        resultats: saisies.map((s) => ({
          id: s.id,
          statut: 'ok',
          saisie: { ...s, corrigeParResponsable: null, majLe: '2026-11-27 10:20:00.000' },
        })),
        changements,
        curseur: '2026-11-27 10:19:55.000',
      },
    }
  }
}

beforeEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()))
  useBenevoleStore.setState({ appareilId: APPAREIL, prenom: 'Marie', magasinId: 2 })
  useSyncStore.setState({ enCours: false, enLigne: true, derniereSynchro: null, erreur: null })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('synchroniser', () => {
  it('envoie les saisies en attente avec l’identifiant de l’appareil, puis les marque envoyées', async () => {
    const saisie = await creerSaisie(NOUVELLE)
    const api = fakeApi({ 'GET /api/referentiel': { body: REFERENTIEL }, 'POST /api/sync': serveurQuiAccepte() })

    expect(await synchroniser()).toBe(true)

    const appel = api.calls.find((c) => c.path === '/api/sync')!
    expect(appel.headers['X-Device-Id']).toBe(APPAREIL)
    expect(appel.body).toMatchObject({ prenom: 'Marie', curseur: null, saisies: [{ id: saisie.id, quantite: 2, baseMajLe: null }] })
    expect(await db.saisies.get(saisie.id)).toMatchObject({ aEnvoyer: 0, baseMajLe: '2026-11-27 10:20:00.000' })
    expect((await db.meta.get(META.curseur))?.valeur).toBe('2026-11-27 10:19:55.000')
    expect((await db.referentiel.get('courant'))?.data).toEqual(REFERENTIEL)
    expect(useSyncStore.getState()).toMatchObject({ enCours: false, enLigne: true, erreur: null })
    expect(useSyncStore.getState().derniereSynchro).not.toBeNull()

    // La synchronisation suivante transmet le curseur et n'a plus rien à envoyer
    await synchroniser()
    expect(api.calls.filter((c) => c.path === '/api/sync').at(-1)?.body).toMatchObject({
      curseur: '2026-11-27 10:19:55.000',
      saisies: [],
    })
  })

  it('conserve les saisies en cas d’absence de réseau', async () => {
    const saisie = await creerSaisie(NOUVELLE)
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))))

    expect(await synchroniser()).toBe(false)

    expect(await db.saisies.get(saisie.id)).toMatchObject({ aEnvoyer: 1 })
    expect(useSyncStore.getState()).toMatchObject({ enCours: false, enLigne: false, erreur: null })
  })

  it('signale une erreur du serveur', async () => {
    fakeApi({
      'GET /api/referentiel': { status: 500, body: { error: { code: 'internal_error', message: 'Erreur interne du serveur.' } } },
    })

    expect(await synchroniser()).toBe(false)

    expect(useSyncStore.getState()).toMatchObject({ enLigne: true, erreur: 'Erreur interne du serveur.' })
  })

  it('applique les corrections faites par un responsable', async () => {
    const saisie = await creerSaisie(NOUVELLE)
    await db.saisies.update(saisie.id, { aEnvoyer: 0, baseMajLe: '2026-11-27 10:15:00.000' })
    const corrigee: SaisieServeur = {
      ...NOUVELLE,
      id: saisie.id,
      quantite: 3,
      saisieLe: saisie.saisieLe,
      modifieLe: '2026-11-27T11:00:00.000+01:00',
      supprime: false,
      corrigeParResponsable: 'Paul',
      majLe: '2026-11-27 11:00:00.000',
    }
    fakeApi({ 'GET /api/referentiel': { body: REFERENTIEL }, 'POST /api/sync': serveurQuiAccepte([corrigee]) })

    await synchroniser()

    expect(await db.saisies.get(saisie.id)).toMatchObject({ quantite: 3, corrigeParResponsable: 'Paul', aEnvoyer: 0 })
  })

  it('envoie les saisies par lots', async () => {
    for (let i = 0; i < TAILLE_LOT + 20; i++) {
      await creerSaisie(NOUVELLE)
    }
    const api = fakeApi({ 'GET /api/referentiel': { body: REFERENTIEL }, 'POST /api/sync': serveurQuiAccepte() })

    await synchroniser()

    const lots = api.calls.filter((c) => c.path === '/api/sync').map((c) => (c.body as SyncRequest).saisies.length)
    expect(lots).toEqual([TAILLE_LOT, 20])
    expect(await db.saisies.where('aEnvoyer').equals(1).count()).toBe(0)
  })

  it('ne lance qu’une synchronisation à la fois', async () => {
    const api = fakeApi({ 'GET /api/referentiel': { body: REFERENTIEL }, 'POST /api/sync': serveurQuiAccepte() })

    await Promise.all([synchroniser(), synchroniser(), synchroniser()])

    expect(api.calls.filter((c) => c.path === '/api/sync')).toHaveLength(1)
  })

  it('ne fait que télécharger le référentiel tant que le prénom n’est pas renseigné', async () => {
    useBenevoleStore.setState({ prenom: null })
    const api = fakeApi({ 'GET /api/referentiel': { body: REFERENTIEL } })

    expect(await synchroniser()).toBe(true)

    expect(api.calls.map((c) => c.path)).toEqual(['/api/referentiel'])
  })
})
