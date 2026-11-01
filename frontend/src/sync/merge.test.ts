import { describe, expect, it } from 'vitest'
import type { SaisieServeur } from '../api/types'
import type { SaisieLocale } from '../db/db'
import { appliquerChangement, appliquerResultat, depuisServeur, versEnvoi } from './merge'

const locale: SaisieLocale = {
  id: 'a',
  campagneId: 1,
  magasinId: 2,
  categorieId: 3,
  quantite: 2,
  contenanceUnitaire: 500,
  formatId: 8,
  saisieLe: '2026-11-27T10:15:00+01:00',
  modifieLe: '2026-11-27T10:15:00.000+01:00',
  supprime: false,
  aEnvoyer: 1,
  baseMajLe: null,
  corrigeParResponsable: null,
  erreur: null,
}

const serveur: SaisieServeur = {
  id: 'a',
  campagneId: 1,
  magasinId: 2,
  categorieId: 3,
  quantite: 2,
  contenanceUnitaire: 500,
  formatId: 8,
  saisieLe: '2026-11-27T10:15:00+01:00',
  modifieLe: '2026-11-27T10:15:00.000+01:00',
  supprime: false,
  corrigeParResponsable: null,
  majLe: '2026-11-27 10:15:01.000',
}

describe('appliquerResultat', () => {
  const envoyee = versEnvoi(locale)

  it('accepte : la saisie n’est plus à envoyer et prend la version serveur', () => {
    expect(appliquerResultat(locale, envoyee, { id: 'a', statut: 'ok', saisie: serveur })).toEqual({
      precisionProduit: null,
      ...locale,
      aEnvoyer: 0,
      baseMajLe: '2026-11-27 10:15:01.000',
    })
  })

  it('accepte, mais modifiée pendant l’envoi : reste à envoyer sur la nouvelle base', () => {
    const modifiee = { ...locale, quantite: 5, modifieLe: '2026-11-27T10:16:00.000+01:00' }

    expect(appliquerResultat(modifiee, envoyee, { id: 'a', statut: 'ok', saisie: serveur })).toEqual({
      ...modifiee,
      baseMajLe: '2026-11-27 10:15:01.000',
    })
  })

  it('conflit : la correction du responsable remplace la version locale', () => {
    const corrigee = { ...serveur, quantite: 3, corrigeParResponsable: 'Paul' }
    const modifiee = { ...locale, quantite: 5, modifieLe: '2026-11-27T10:16:00.000+01:00' }

    expect(appliquerResultat(modifiee, envoyee, { id: 'a', statut: 'conflit', saisie: corrigee })).toEqual(
      depuisServeur(corrigee),
    )
  })

  it('refus : la saisie est marquée en erreur et n’est plus renvoyée', () => {
    expect(appliquerResultat(locale, envoyee, { id: 'a', statut: 'rejete', erreur: 'Catégorie inconnue.' })).toEqual({
      ...locale,
      aEnvoyer: 0,
      erreur: 'Catégorie inconnue.',
    })
  })

  it('refus d’une version dépassée : rien ne change', () => {
    const modifiee = { ...locale, modifieLe: '2026-11-27T10:16:00.000+01:00' }

    expect(appliquerResultat(modifiee, envoyee, { id: 'a', statut: 'rejete', erreur: 'x' })).toBeNull()
  })
})

describe('appliquerChangement', () => {
  it('envoie une saisie antérieure aux variantes sans bouton', () => {
    const { formatId: _, ...ancienne } = locale
    expect(versEnvoi(ancienne).formatId).toBeNull()
    const { formatId: __, ...ancienServeur } = serveur
    expect(depuisServeur(ancienServeur).formatId).toBeNull()
  })

  it('applique une correction sur une saisie déjà synchronisée', () => {
    const corrigee = { ...serveur, quantite: 3, corrigeParResponsable: 'Paul' }

    expect(appliquerChangement({ ...locale, aEnvoyer: 0 }, corrigee)).toEqual(depuisServeur(corrigee))
  })

  it('restaure une saisie inconnue du téléphone', () => {
    expect(appliquerChangement(undefined, serveur)).toEqual(depuisServeur(serveur))
  })

  it('n’écrase pas une saisie locale en attente d’envoi', () => {
    expect(appliquerChangement(locale, serveur)).toBeNull()
  })
})
