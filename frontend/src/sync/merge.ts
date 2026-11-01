import type { ResultatSync, SaisieEnvoyee, SaisieServeur } from '../api/types'
import type { SaisieLocale } from '../db/db'

/**
 * Règles de fusion entre les saisies du téléphone et les réponses du serveur (fonctions pures).
 */

export function versEnvoi(saisie: SaisieLocale): SaisieEnvoyee {
  return {
    id: saisie.id,
    campagneId: saisie.campagneId,
    magasinId: saisie.magasinId,
    categorieId: saisie.categorieId,
    quantite: saisie.quantite,
    contenanceUnitaire: saisie.contenanceUnitaire,
    formatId: saisie.formatId ?? null,
    precisionProduit: saisie.precisionProduit ?? null,
    saisieLe: saisie.saisieLe,
    modifieLe: saisie.modifieLe,
    supprime: saisie.supprime,
    baseMajLe: saisie.baseMajLe,
  }
}

/** Version locale reflétant exactement l'état du serveur (plus rien à envoyer) */
export function depuisServeur(saisie: SaisieServeur): SaisieLocale {
  return {
    id: saisie.id,
    campagneId: saisie.campagneId,
    magasinId: saisie.magasinId,
    categorieId: saisie.categorieId,
    quantite: saisie.quantite,
    contenanceUnitaire: saisie.contenanceUnitaire,
    formatId: saisie.formatId ?? null,
    precisionProduit: saisie.precisionProduit ?? null,
    saisieLe: saisie.saisieLe,
    modifieLe: saisie.modifieLe,
    supprime: saisie.supprime,
    aEnvoyer: 0,
    baseMajLe: saisie.majLe,
    corrigeParResponsable: saisie.corrigeParResponsable,
    erreur: null,
  }
}

/**
 * Applique le résultat de l'envoi d'une saisie.
 *
 * @param locale  version locale actuelle (elle a pu être modifiée pendant l'envoi)
 * @param envoyee version envoyée au serveur
 * @return la nouvelle version locale, ou null si rien ne change
 */
export function appliquerResultat(
  locale: SaisieLocale | undefined,
  envoyee: SaisieEnvoyee,
  resultat: ResultatSync,
): SaisieLocale | null {
  const modifieeDepuisEnvoi = locale !== undefined && locale.modifieLe !== envoyee.modifieLe

  if (resultat.statut === 'rejete') {
    // Le refus ne concerne que la version envoyée : une version plus récente sera envoyée à son tour
    return locale && !modifieeDepuisEnvoi ? { ...locale, aEnvoyer: 0, erreur: resultat.erreur ?? 'Saisie refusée.' } : null
  }
  if (!resultat.saisie) {
    return null
  }
  // Correction d'un responsable : elle l'emporte sur toute version locale
  if (resultat.statut === 'conflit' || !modifieeDepuisEnvoi) {
    return depuisServeur(resultat.saisie)
  }
  // Modifiée pendant l'envoi : la nouvelle version reste à envoyer, sur la base de la version serveur
  return locale ? { ...locale, baseMajLe: resultat.saisie.majLe } : depuisServeur(resultat.saisie)
}

/**
 * Applique une saisie modifiée côté serveur (correction d'un responsable, restauration).
 * Une saisie locale en attente d'envoi n'est pas écrasée : le serveur arbitrera lors de son envoi.
 */
export function appliquerChangement(locale: SaisieLocale | undefined, serveur: SaisieServeur): SaisieLocale | null {
  if (locale?.aEnvoyer === 1) {
    return null
  }
  return depuisServeur(serveur)
}
