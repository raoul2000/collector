import { useEffect, useState } from 'react'
import type { CategorieRef } from '../../api/types'
import { Alert } from '../../components/Alert'
import { Tile } from '../../components/Tile'
import { toast } from '../../components/toast'
import { creerSaisie, supprimerSaisie } from '../../db/saisies'
import { demanderSynchro } from '../../sync/engine'
import { useBenevole } from '../benevole/context'
import { boutonsCategorie, libelleSaisie, varianteSaisie } from './libelle'
import { grouperParSection, type GroupeCategories } from './sections'
import { SaisieForm, type ContenuForm } from './SaisieForm'
import styles from './SaisiePage.module.css'

/** Durée pendant laquelle la dernière saisie peut être annulée d'un appui */
export const DUREE_ANNULATION_MS = 8000

const DETAIL_UNITE = { kg: 'poids', L: 'volume', unite: 'à l\'unité' } as const

/**
 * Saisie des dons : choix de la catégorie, puis du poids / volume et de la quantité.
 * Après validation, retour immédiat à la grille des catégories, prêt pour l'article suivant.
 */
export function SaisiePage() {
  const { referentiel, magasin } = useBenevole()
  const [categorie, setCategorie] = useState<CategorieRef | null>(null)
  const [derniere, setDerniere] = useState<{ id: string; libelle: string } | null>(null)

  // La possibilité d'annuler disparaît après quelques secondes
  useEffect(() => {
    if (!derniere) {
      return
    }
    const minuteur = setTimeout(() => setDerniere(null), DUREE_ANNULATION_MS)
    return () => clearTimeout(minuteur)
  }, [derniere])

  const campagne = referentiel.campagne
  if (!campagne) {
    return <Alert kind="warning">Aucune collecte n'est en cours : la saisie n'est pas disponible.</Alert>
  }
  if (referentiel.categories.length === 0) {
    return <Alert kind="warning">Aucune catégorie de produits n'est définie pour l'instant.</Alert>
  }

  const enregistrer = async (choisie: CategorieRef, contenu: ContenuForm) => {
    const saisie = await creerSaisie({
      campagneId: campagne.id,
      magasinId: magasin.id,
      categorieId: choisie.id,
      ...contenu,
    })
    demanderSynchro()
    setDerniere({
      id: saisie.id,
      libelle: libelleSaisie(choisie, contenu.quantite, contenu.contenanceUnitaire, varianteSaisie(choisie, contenu.formatId)),
    })
    setCategorie(null)
    window.scrollTo?.({ top: 0 })
  }

  const annuler = async () => {
    if (!derniere) {
      return
    }
    await supprimerSaisie(derniere.id)
    demanderSynchro()
    toast.info(`Saisie annulée : ${derniere.libelle}`)
    setDerniere(null)
  }

  return (
    <div className={styles.page}>
      {derniere && (
        <div className={styles.confirmation} role="status">
          <span className={styles.check} aria-hidden="true">
            ✓
          </span>
          <span className={styles.confirmationTexte}>{derniere.libelle}</span>
          <button type="button" className={styles.annuler} onClick={() => void annuler()}>
            Annuler
          </button>
        </div>
      )}

      {categorie === null ? (
        <>
          <h1 className="visually-hidden">Choisir une catégorie</h1>
          <GrilleCategories groupes={grouperParSection(referentiel)} onChoisir={setCategorie} />
        </>
      ) : (
        <>
          <div className={styles.detailHeader}>
            <button type="button" className={styles.retour} onClick={() => setCategorie(null)} aria-label="Changer de catégorie">
              ←
            </button>
            <h1 className={styles.detailTitre}>{categorie.nom}</h1>
          </div>
          <SaisieForm
            key={categorie.id}
            unite={categorie.unite}
            boutons={boutonsCategorie(categorie)}
            submitLabel="Valider"
            onSubmit={(contenu) => void enregistrer(categorie, contenu)}
          />
        </>
      )}
    </div>
  )
}

const idGroupe = (groupe: GroupeCategories) => `section-${groupe.section?.id ?? 'autres'}`

/**
 * Grille unique des catégories. Avec des sections : un intitulé par section et, en haut, une barre de raccourcis
 * qui fait défiler la grille jusqu'à la section (aucun écran supplémentaire à traverser).
 */
function GrilleCategories({ groupes, onChoisir }: { groupes: GroupeCategories[]; onChoisir: (c: CategorieRef) => void }) {
  const tuiles = (groupe: GroupeCategories) => (
    <div className={styles.grid}>
      {groupe.categories.map((c) => (
        <Tile key={c.id} size="lg" detail={DETAIL_UNITE[c.unite]} onClick={() => onChoisir(c)}>
          {c.nom}
        </Tile>
      ))}
    </div>
  )

  if (groupes.length === 1 && groupes[0]!.section === null) {
    return tuiles(groupes[0]!)
  }

  return (
    <>
      <nav className={styles.sections} aria-label="Sections">
        {groupes.map((g) => (
          <button
            key={idGroupe(g)}
            type="button"
            className={styles.raccourci}
            onClick={() => document.getElementById(idGroupe(g))?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })}
          >
            {g.section?.nom ?? 'Autres'}
          </button>
        ))}
      </nav>
      {groupes.map((g) => (
        <section key={idGroupe(g)} className={styles.groupe} aria-labelledby={idGroupe(g)}>
          <h2 id={idGroupe(g)} className={styles.titreSection}>
            {g.section?.nom ?? 'Autres'}
          </h2>
          {tuiles(g)}
        </section>
      ))}
    </>
  )
}
