import { beforeEach, describe, expect, it } from 'vitest'
import type { Referentiel } from '../api/types'
import { db } from './db'
import { enregistrerReferentiel } from './referentiel'
import { creerSaisie, modifierSaisie, supprimerSaisie } from './saisies'

beforeEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()))
})

const NOUVELLE = { campagneId: 1, magasinId: 2, categorieId: 3, quantite: 2, contenanceUnitaire: 500 }

describe('saisies locales', () => {
  it('crée une saisie à envoyer, horodatée sur le téléphone', async () => {
    const saisie = await creerSaisie(NOUVELLE, new Date('2026-11-27T09:15:00.250Z'))

    expect(saisie.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
    expect(await db.saisies.get(saisie.id)).toEqual({
      ...NOUVELLE,
      formatId: null,
      id: saisie.id,
      saisieLe: '2026-11-27T10:15:00+01:00',
      modifieLe: '2026-11-27T10:15:00.250+01:00',
      supprime: false,
      aEnvoyer: 1,
      baseMajLe: null,
      corrigeParResponsable: null,
      erreur: null,
    })
  })

  it('modifie une saisie et la marque à envoyer', async () => {
    const saisie = await creerSaisie(NOUVELLE)
    await db.saisies.update(saisie.id, { aEnvoyer: 0, erreur: 'refusée' })

    await modifierSaisie(saisie.id, { categorieId: 4, quantite: 3, contenanceUnitaire: null }, new Date('2026-11-27T10:00:00Z'))

    expect(await db.saisies.get(saisie.id)).toMatchObject({
      categorieId: 4,
      quantite: 3,
      contenanceUnitaire: null,
      modifieLe: '2026-11-27T11:00:00.000+01:00',
      aEnvoyer: 1,
      erreur: null,
    })
  })

  it('supprime logiquement une saisie pour transmettre la suppression', async () => {
    const saisie = await creerSaisie(NOUVELLE)
    await db.saisies.update(saisie.id, { aEnvoyer: 0 })

    await supprimerSaisie(saisie.id)

    expect(await db.saisies.get(saisie.id)).toMatchObject({ supprime: true, aEnvoyer: 1 })
  })
})

describe('référentiel local', () => {
  const referentiel: Referentiel = { campagne: null, magasins: [], categories: [], version: 'v1' }

  it('n’est réécrit que si sa version change', async () => {
    await enregistrerReferentiel(referentiel, new Date('2026-11-27T08:00:00Z'))
    await enregistrerReferentiel(referentiel, new Date('2026-11-27T09:00:00Z'))
    expect((await db.referentiel.get('courant'))?.misAJourLe).toBe('2026-11-27T08:00:00.000Z')

    await enregistrerReferentiel({ ...referentiel, version: 'v2' }, new Date('2026-11-27T10:00:00Z'))
    expect(await db.referentiel.get('courant')).toMatchObject({ data: { version: 'v2' }, misAJourLe: '2026-11-27T10:00:00.000Z' })
  })
})
