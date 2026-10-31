import { useState } from 'react'
import type { CategorieRef } from '../../api/types'
import { Badge } from '../../components/Badge'
import type { SaisieLocale } from '../../db/db'
import { useMesSaisies } from '../../db/saisies'
import { formatHeure, formatJour } from '../../lib/dates'
import { libelleSaisie, varianteSaisie } from '../saisie/libelle'
import { useBenevole } from './context'
import styles from './MesSaisiesPage.module.css'
import { ModifierSaisieDialog } from './ModifierSaisieDialog'

function Statut({ saisie }: { saisie: SaisieLocale }) {
  if (saisie.erreur) {
    return <Badge kind="danger">Refusée</Badge>
  }
  if (saisie.aEnvoyer) {
    return <Badge kind="info">En attente</Badge>
  }
  if (saisie.corrigeParResponsable) {
    return <Badge kind="warning">Corrigée par {saisie.corrigeParResponsable}</Badge>
  }
  return <Badge kind="success">Envoyée</Badge>
}

/**
 * Saisies faites depuis ce téléphone, par jour, de la plus récente à la plus ancienne.
 * Un appui sur une saisie permet de la modifier ou de la supprimer.
 */
export function MesSaisiesPage() {
  const { referentiel, magasin } = useBenevole()
  const saisies = useMesSaisies()
  const [editee, setEditee] = useState<SaisieLocale | null>(null)

  const categories = new Map<number, CategorieRef>(referentiel.categories.map((c) => [c.id, c]))
  const magasins = new Map(referentiel.magasins.map((m) => [m.id, m.nom]))

  if (saisies === undefined) {
    return null
  }

  const parJour = new Map<string, SaisieLocale[]>()
  for (const saisie of saisies) {
    const jour = formatJour(saisie.saisieLe)
    parJour.set(jour, [...(parJour.get(jour) ?? []), saisie])
  }
  const nbArticles = saisies.reduce((total, s) => total + s.quantite, 0)

  return (
    <div className={styles.page}>
      <div>
        <h1 className={styles.title}>Mes saisies</h1>
        <p className={styles.resume}>
          {saisies.length === 0
            ? 'Aucune saisie depuis ce téléphone pour l\'instant.'
            : `${saisies.length} saisie${saisies.length > 1 ? 's' : ''} · ${nbArticles} article${nbArticles > 1 ? 's' : ''}`}
        </p>
      </div>

      {[...parJour].map(([jour, duJour]) => (
        <section key={jour} className={styles.jour}>
          <h2 className={styles.jourTitre}>{jour}</h2>
          <ul className={styles.liste}>
            {duJour.map((saisie) => (
              <li key={saisie.id}>
                <button type="button" className={styles.ligne} onClick={() => setEditee(saisie)}>
                  <span className={styles.heure}>{formatHeure(saisie.saisieLe)}</span>
                  <span className={styles.contenu}>
                    <span className={styles.libelle}>
                      {libelleSaisie(
                        categories.get(saisie.categorieId),
                        saisie.quantite,
                        saisie.contenanceUnitaire,
                        varianteSaisie(categories.get(saisie.categorieId), saisie.formatId),
                      )}
                    </span>
                    {saisie.magasinId !== magasin.id && (
                      <span className={styles.magasin}>{magasins.get(saisie.magasinId) ?? 'Autre magasin'}</span>
                    )}
                    {saisie.erreur && <span className={styles.erreur}>{saisie.erreur}</span>}
                  </span>
                  <Statut saisie={saisie} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {editee && (
        <ModifierSaisieDialog saisie={editee} categories={referentiel.categories} onClose={() => setEditee(null)} />
      )}
    </div>
  )
}
