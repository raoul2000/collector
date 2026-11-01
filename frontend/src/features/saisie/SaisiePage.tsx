import { useEffect, useRef, useState } from 'react'
import type { CategorieRef, FormatRef, SectionRef } from '../../api/types'
import { Alert } from '../../components/Alert'
import { Tile } from '../../components/Tile'
import { toast } from '../../components/toast'
import { cx } from '../../lib/cx'
import { enregistrerRecherche } from '../../db/recherches'
import { creerSaisie, supprimerSaisie, useCategoriesRecentes } from '../../db/saisies'
import { demanderSynchro } from '../../sync/engine'
import { useBenevole } from '../benevole/context'
import { boutonsCategorie, libelleBouton, libelleSaisie, varianteSaisie } from './libelle'
import { normaliser, rechercher } from './recherche'
import { grouperParSection, type GroupeCategories } from './sections'
import { SaisieForm, type ContenuForm } from './SaisieForm'
import styles from './SaisiePage.module.css'

/** Durée pendant laquelle la dernière saisie peut être annulée d'un appui */
export const DUREE_ANNULATION_MS = 8000

/** Le bandeau apparaît sous le pouce qui vient de valider : un double appui n'annule pas la saisie */
export const GARDE_ANNULATION_MS = 500

const DETAIL_UNITE = { kg: 'poids', L: 'volume', unite: 'à l\'unité' } as const

/** Catégories récentes affichées en haut de la grille */
export const NB_RECENTES = 4

/** En dessous, la grille tient presque sur un écran : la ligne des récentes n'apporterait rien */
export const SEUIL_RECENTES = 8

/**
 * Saisie des dons : choix de la catégorie, puis du poids / volume et de la quantité.
 * Après validation, retour immédiat à la grille des catégories, prêt pour l'article suivant.
 */
export function SaisiePage() {
  const { referentiel, magasin } = useBenevole()
  const [categorie, setCategorie] = useState<CategorieRef | null>(null)
  // Variante trouvée par la recherche : la saisie s'ouvre sur ce bouton
  const [boutonInitial, setBoutonInitial] = useState<FormatRef>()
  const [recherche, setRecherche] = useState('')
  const [derniere, setDerniere] = useState<{ id: string; libelle: string; le: number } | null>(null)
  const idsRecents = useCategoriesRecentes(
    referentiel.categories.length > SEUIL_RECENTES ? referentiel.categories.map((c) => c.id) : [],
    NB_RECENTES,
  )
  const recentes = (idsRecents ?? []).flatMap((id) => referentiel.categories.find((c) => c.id === id) ?? [])

  // Dernière recherche restée sans résultat : enregistrée avec la catégorie finalement choisie (ou aucune si le
  // bénévole quitte l'écran), pour que les responsables complètent les mots-clés
  const sansResultat = useRef<{ campagneId: number; terme: string } | null>(null)
  useEffect(() => {
    const sansReponse = normaliser(recherche) !== '' && rechercher(recherche, referentiel.categories, referentiel.sections).length === 0
    if (referentiel.campagne && sansReponse) {
      sansResultat.current = { campagneId: referentiel.campagne.id, terme: recherche }
    }
  }, [recherche, referentiel])
  useEffect(
    () => () => {
      if (sansResultat.current) {
        void enregistrerRecherche(sansResultat.current.campagneId, sansResultat.current.terme, null)
      }
    },
    [],
  )

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
      le: Date.now(),
      id: saisie.id,
      libelle: libelleSaisie(choisie, contenu.quantite, contenu.contenanceUnitaire, varianteSaisie(choisie, contenu.formatId)),
    })
    setCategorie(null)
    window.scrollTo?.({ top: 0 })
  }

  const choisir = (choisie: CategorieRef, bouton?: FormatRef) => {
    if (sansResultat.current) {
      void enregistrerRecherche(sansResultat.current.campagneId, sansResultat.current.terme, choisie.id)
      sansResultat.current = null
    }
    // Le bénévole passe au don suivant : le bandeau ne doit pas masquer « Valider » (annulation encore possible dans Mes saisies)
    setDerniere(null)
    setCategorie(choisie)
    setBoutonInitial(bouton)
    setRecherche('')
  }

  const nomSection = (c: CategorieRef) => referentiel.sections?.find((s) => s.id === c.sectionId)?.nom

  const annuler = async () => {
    if (!derniere || Date.now() - derniere.le < GARDE_ANNULATION_MS) {
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
        <div className={styles.confirmation} role="status" data-confirmation-saisie>
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
          <div className={styles.recherche}>
            <label htmlFor="recherche-categorie" className="visually-hidden">
              Rechercher un produit
            </label>
            <input
              id="recherche-categorie"
              className={styles.rechercheInput}
              type="search"
              enterKeyHint="search"
              autoComplete="off"
              placeholder="Rechercher un produit (ex. lentilles)"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
            />
            {recherche !== '' && (
              <button type="button" className={styles.effacer} onClick={() => setRecherche('')} aria-label="Effacer la recherche">
                ×
              </button>
            )}
          </div>
          {normaliser(recherche) !== '' ? (
            <ResultatsRecherche
              recherche={recherche}
              categories={referentiel.categories}
              sections={referentiel.sections ?? []}
              onChoisir={choisir}
              onEffacer={() => setRecherche('')}
            />
          ) : (
            <>
              {recentes.length > 0 && (
                <section className={cx(styles.groupe, styles.recents)} aria-labelledby="categories-recentes">
                  <h2 id="categories-recentes" className={styles.titreSection}>
                    Récents
                  </h2>
                  <div className={styles.grid}>
                    {recentes.map((c) => (
                      // Hors de sa section, un nom comme « Légumes » a besoin de son contexte (Conserves)
                      <Tile key={c.id} onClick={() => choisir(c)} detail={nomSection(c)}>
                        {c.nom}
                      </Tile>
                    ))}
                  </div>
                </section>
              )}
              <GrilleCategories groupes={grouperParSection(referentiel)} onChoisir={choisir} />
            </>
          )}
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
            key={`${categorie.id}-${boutonInitial?.id ?? ''}`}
            unite={categorie.unite}
            boutons={boutonsCategorie(categorie)}
            initial={boutonInitial && { quantite: 1, contenanceUnitaire: boutonInitial.contenance, formatId: boutonInitial.id }}
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

interface ResultatsRechercheProps {
  recherche: string
  categories: CategorieRef[]
  sections: SectionRef[]
  onChoisir: (categorie: CategorieRef, bouton?: FormatRef) => void
  onEffacer: () => void
}

/**
 * Résultats de la recherche : catégories et variantes trouvées. Sans résultat, la catégorie « Autre » (si elle
 * existe) permet de saisir quand même.
 */
function ResultatsRecherche({ recherche, categories, sections, onChoisir, onEffacer }: ResultatsRechercheProps) {
  const resultats = rechercher(recherche, categories, sections)
  const section = (c: CategorieRef) => sections.find((s) => s.id === c.sectionId)?.nom

  if (resultats.length === 0) {
    const autre = categories.find((c) => normaliser(c.nom) === 'autre')
    return (
      <div className={styles.sansResultat} role="status">
        <p>Aucune catégorie ne correspond à « {recherche.trim()} ».</p>
        <div className={styles.grid}>
          {autre && (
            <Tile size="lg" detail="produit non prévu" onClick={() => onChoisir(autre)}>
              {autre.nom}
            </Tile>
          )}
          <Tile size="lg" onClick={onEffacer}>
            Voir toutes les catégories
          </Tile>
        </div>
      </div>
    )
  }

  return (
    <section aria-label="Résultats de la recherche" className={styles.grid}>
      {resultats.map(({ categorie, bouton, motCle }) => (
        <Tile
          key={`${categorie.id}-${bouton?.id ?? ''}`}
          size="lg"
          onClick={() => onChoisir(categorie, bouton)}
          detail={bouton ? libelleBouton(bouton, categorie.unite) : (motCle ?? section(categorie))}
        >
          {categorie.nom}
        </Tile>
      ))}
    </section>
  )
}
