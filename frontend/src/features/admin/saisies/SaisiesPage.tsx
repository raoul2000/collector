import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import type { Categorie, FiltresSaisies, SaisieAdmin } from '../../../api/types'
import { Alert } from '../../../components/Alert'
import { Badge } from '../../../components/Badge'
import { Button } from '../../../components/Button'
import { Checkbox } from '../../../components/Checkbox'
import { ConfirmDialog } from '../../../components/ConfirmDialog'
import { Select } from '../../../components/Select'
import { Table } from '../../../components/Table'
import { TextField } from '../../../components/TextField'
import { toast } from '../../../components/toast'
import { libelleSaisie } from '../../saisie/libelle'
import styles from '../admin.module.css'
import { PAR_PAGE, useAdminSaisies, useCampagnes, useCategories, useMagasins, useSupprimerSaisie } from '../api'
import { CategorieFormDialog } from '../categories/CategorieFormDialog'
import { handleMutationError } from '../errors'
import { PageHeader } from '../PageHeader'
import { ChangerMagasinDialog } from './ChangerMagasinDialog'
import { CorrigerSaisieDialog } from './CorrigerSaisieDialog'
import { magasinsDisponibles, nomMagasin } from './magasins'
import pageStyles from './SaisiesPage.module.css'

const dateHeure = (iso: string) =>
  new Date(iso).toLocaleString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

function libelleAdmin(saisie: SaisieAdmin): string {
  return libelleSaisie({ nom: saisie.categorieNom, unite: saisie.unite }, saisie.quantite, saisie.contenanceUnitaire, saisie.formatLibelle)
}

/**
 * Consultation des saisies des bénévoles et correction des erreurs.
 */
export function SaisiesPage() {
  const campagnes = useCampagnes()
  const magasins = useMagasins()
  const categories = useCategories()
  const supprimer = useSupprimerSaisie()

  // Filtres reçus dans l'adresse (lien « Voir ses saisies » de la page Appareils)
  const [searchParams, setSearchParams] = useSearchParams()
  const campagneDemandee = Number(searchParams.get('campagne')) || undefined
  const [filtres, setFiltres] = useState<FiltresSaisies>({
    page: 1,
    campagne: campagneDemandee,
    appareil: searchParams.get('appareil') ?? undefined,
    categorie: Number(searchParams.get('categorie')) || undefined,
  })
  const [prenom, setPrenom] = useState('')
  const [code, setCode] = useState('')
  const [corrigee, setCorrigee] = useState<SaisieAdmin | null>(null)
  const [aSupprimer, setASupprimer] = useState<SaisieAdmin | null>(null)
  // Saisies cochées pour un changement de magasin groupé, limitées à la page affichée
  const [selection, setSelection] = useState<ReadonlySet<string>>(new Set())
  const [changementMagasin, setChangementMagasin] = useState(false)
  const [filtresSelection, setFiltresSelection] = useState(filtres)
  if (filtresSelection !== filtres) {
    setFiltresSelection(filtres)
    setSelection(new Set())
  }
  // Catégorie ouverte depuis la colonne « Code » pour lui ajouter un code
  const [categorieACompleter, setCategorieACompleter] = useState<Categorie | null>(null)

  // Campagne active sélectionnée par défaut
  const active = campagnes.data?.find((c) => c.active)
  const [campagneInitialisee, setCampagneInitialisee] = useState(campagneDemandee !== undefined)
  if (!campagneInitialisee && campagnes.data) {
    setCampagneInitialisee(true)
    setFiltres((f) => ({ ...f, campagne: active?.id }))
  }

  const retirerFiltreAppareil = () => {
    filtrer({ appareil: undefined })
    setSearchParams({}, { replace: true })
  }

  // Le filtre sur le prénom s'applique quand la frappe s'interrompt
  useEffect(() => {
    const minuteur = setTimeout(() => setFiltres((f) => ((f.prenom ?? '') === prenom ? f : { ...f, prenom, page: 1 })), 300)
    return () => clearTimeout(minuteur)
  }, [prenom])

  // Idem pour le code AÏDA
  useEffect(() => {
    const minuteur = setTimeout(() => setFiltres((f) => ((f.code ?? '') === code ? f : { ...f, code, page: 1 })), 300)
    return () => clearTimeout(minuteur)
  }, [code])

  // Pas de chargement avant que la campagne par défaut soit connue
  const saisies = useAdminSaisies(filtres, campagneInitialisee)
  const filtrer = (changement: Partial<FiltresSaisies>) => setFiltres((f) => ({ ...f, ...changement, page: 1 }))
  const nombre = (valeur: string) => (valeur === '' ? undefined : Number(valeur))
  const nbPages = saisies.data ? Math.max(1, Math.ceil(saisies.data.total / PAR_PAGE)) : 1

  const selectionnables = saisies.data?.saisies.filter((s) => !s.supprime) ?? []
  const selectionnees = selectionnables.filter((s) => selection.has(s.id))
  const toutesSelectionnees = selectionnables.length > 0 && selectionnees.length === selectionnables.length
  const basculer = (id: string) =>
    setSelection((ids) => {
      const suivante = new Set(ids)
      if (!suivante.delete(id)) {
        suivante.add(id)
      }
      return suivante
    })
  const disponibles = (campagneIds: number[]) => magasinsDisponibles(magasins.data ?? [], campagnes.data ?? [], campagneIds)

  const confirmerSuppression = () => {
    if (!aSupprimer) {
      return
    }
    supprimer.mutate(aSupprimer.id, {
      onSuccess: () => toast.success('Saisie supprimée.'),
      onError: (error) => handleMutationError(error),
      onSettled: () => setASupprimer(null),
    })
  }

  return (
    <>
      <PageHeader
        title="Saisies"
        description="Saisies des bénévoles. Une correction est transmise au téléphone du bénévole à sa prochaine synchronisation."
      />

      <div className={pageStyles.filtres}>
        <Select
          label="Campagne"
          value={filtres.campagne ?? ''}
          onChange={(e) => filtrer({ campagne: nombre(e.target.value) })}
        >
          <option value="">Toutes</option>
          {campagnes.data?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nom}
            </option>
          ))}
        </Select>
        <Select label="Magasin" value={filtres.magasin ?? ''} onChange={(e) => filtrer({ magasin: nombre(e.target.value) })}>
          <option value="">Tous</option>
          {magasins.data?.map((m) => (
            <option key={m.id} value={m.id}>
              {nomMagasin(m)}
            </option>
          ))}
        </Select>
        <Select
          label="Catégorie"
          value={filtres.categorie ?? ''}
          onChange={(e) => filtrer({ categorie: nombre(e.target.value) })}
        >
          <option value="">Toutes</option>
          {categories.data?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nom}
            </option>
          ))}
        </Select>
        <TextField label="Bénévole" placeholder="Prénom" value={prenom} onChange={(e) => setPrenom(e.target.value)} />
        <TextField
          label="Code"
          placeholder="Code AÏDA"
          value={code}
          disabled={filtres.sansCode}
          onChange={(e) => setCode(e.target.value)}
        />
        <Checkbox
          label="Sans code AÏDA"
          checked={filtres.sansCode ?? false}
          onChange={(e) => filtrer({ sansCode: e.target.checked })}
        />
        <Checkbox
          label="Afficher les saisies supprimées"
          checked={filtres.supprimees ?? false}
          onChange={(e) => filtrer({ supprimees: e.target.checked })}
        />
      </div>

      {filtres.appareil && (
        <p className={pageStyles.filtreAppareil}>
          <span>
            Saisies de l'appareil <code>{filtres.appareil.slice(0, 8)}</code>
            {saisies.data?.saisies[0] && ` (${saisies.data.saisies[0].prenom})`}
          </span>
          <Button size="sm" variant="ghost" onClick={retirerFiltreAppareil}>
            Retirer ce filtre
          </Button>
        </p>
      )}

      {saisies.isPending && <p className={styles.loading}>Chargement…</p>}
      {saisies.isError && <Alert kind="error">{saisies.error.message}</Alert>}
      {saisies.data && (
        <>
          <div className={pageStyles.barre}>
            <p className={pageStyles.total}>
              {saisies.data.total} saisie{saisies.data.total > 1 ? 's' : ''}
            </p>
            {selectionnees.length > 0 && (
              <div className={pageStyles.selection}>
                <span>
                  {selectionnees.length} sélectionnée{selectionnees.length > 1 ? 's' : ''}
                </span>
                <Button size="sm" onClick={() => setChangementMagasin(true)}>
                  Changer de magasin…
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSelection(new Set())}>
                  Annuler la sélection
                </Button>
              </div>
            )}
          </div>
          <Table>
            <thead>
              <tr>
                <th className={pageStyles.choix}>
                  <input
                    type="checkbox"
                    aria-label="Sélectionner toutes les saisies de la page"
                    checked={toutesSelectionnees}
                    disabled={selectionnables.length === 0}
                    onChange={() => setSelection(new Set(toutesSelectionnees ? [] : selectionnables.map((s) => s.id)))}
                  />
                </th>
                <th>Date</th>
                <th>Magasin</th>
                <th>Bénévole</th>
                <th>Code</th>
                <th>Saisie</th>
                <th>Statut</th>
                <th>
                  <span className="visually-hidden">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {saisies.data.saisies.length === 0 && (
                <tr>
                  <td colSpan={8} className={styles.empty}>
                    Aucune saisie ne correspond à ces critères.
                  </td>
                </tr>
              )}
              {saisies.data.saisies.map((saisie) => (
                <tr key={saisie.id} className={saisie.supprime ? pageStyles.supprimee : undefined}>
                  <td className={pageStyles.choix}>
                    {!saisie.supprime && (
                      <input
                        type="checkbox"
                        aria-label={`Sélectionner la saisie de ${saisie.prenom} du ${dateHeure(saisie.saisieLe)}`}
                        checked={selection.has(saisie.id)}
                        onChange={() => basculer(saisie.id)}
                      />
                    )}
                  </td>
                  <td className={pageStyles.date}>{dateHeure(saisie.saisieLe)}</td>
                  <td>{saisie.magasinNom}</td>
                  <td>{saisie.prenom}</td>
                  <td className={pageStyles.code}>
                    {saisie.codeAida ?? <SansCode saisie={saisie} categories={categories.data} onOuvrir={setCategorieACompleter} />}
                    {saisie.codeAVerifier && <div className={styles.muted}>à vérifier</div>}
                  </td>
                  <td>
                    {libelleAdmin(saisie)}
                    {saisie.precisionProduit && <div className={styles.muted}>« {saisie.precisionProduit} »</div>}
                  </td>
                  <td>
                    {saisie.supprime ? (
                      <Badge kind="danger">Supprimée</Badge>
                    ) : saisie.corrigeParResponsable ? (
                      <Badge kind="warning">Corrigée par {saisie.corrigeParResponsable}</Badge>
                    ) : null}
                  </td>
                  <td>
                    {!saisie.supprime && (
                      <div className={styles.actionsCell}>
                        <Button size="sm" variant="secondary" onClick={() => setCorrigee(saisie)}>
                          Corriger
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => setASupprimer(saisie)}>
                          Supprimer
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>

          {nbPages > 1 && (
            <nav className={pageStyles.pagination} aria-label="Pagination">
              <Button
                size="sm"
                variant="secondary"
                disabled={filtres.page <= 1}
                onClick={() => setFiltres((f) => ({ ...f, page: f.page - 1 }))}
              >
                ← Précédentes
              </Button>
              <span>
                Page {filtres.page} / {nbPages}
              </span>
              <Button
                size="sm"
                variant="secondary"
                disabled={filtres.page >= nbPages}
                onClick={() => setFiltres((f) => ({ ...f, page: f.page + 1 }))}
              >
                Suivantes →
              </Button>
            </nav>
          )}
        </>
      )}

      {corrigee && categories.data && (
        <CorrigerSaisieDialog
          saisie={corrigee}
          categories={categories.data}
          magasins={disponibles([corrigee.campagneId])}
          onClose={() => setCorrigee(null)}
        />
      )}

      {changementMagasin && (
        <ChangerMagasinDialog
          saisies={selectionnees}
          magasins={disponibles([...new Set(selectionnees.map((s) => s.campagneId))])}
          onDone={() => setSelection(new Set())}
          onClose={() => setChangementMagasin(false)}
        />
      )}

      {categorieACompleter && (
        <CategorieFormDialog categorie={categorieACompleter} onClose={() => setCategorieACompleter(null)} />
      )}

      <ConfirmDialog
        open={aSupprimer !== null}
        title="Supprimer la saisie ?"
        confirmLabel="Supprimer"
        danger
        loading={supprimer.isPending}
        onConfirm={confirmerSuppression}
        onCancel={() => setASupprimer(null)}
      >
        {aSupprimer && `${libelleAdmin(aSupprimer)} (${aSupprimer.prenom}, ${aSupprimer.magasinNom}) ne sera plus comptée dans la collecte.`}
      </ConfirmDialog>
    </>
  )
}

/**
 * Tiret d'une saisie sans code AÏDA : ouvre la catégorie pour le compléter.
 */
function SansCode({
  saisie,
  categories,
  onOuvrir,
}: {
  saisie: SaisieAdmin
  categories: Categorie[] | undefined
  onOuvrir: (categorie: Categorie) => void
}) {
  const categorie = categories?.find((c) => c.id === saisie.categorieId)
  if (!categorie || saisie.supprime) {
    return <span className={styles.muted}>—</span>
  }
  return (
    <button
      type="button"
      className={pageStyles.ajouterCode}
      onClick={() => onOuvrir(categorie)}
      aria-label={`Ajouter un code AÏDA à « ${categorie.nom} »`}
      title="Ajouter un code AÏDA à la catégorie"
    >
      —
    </button>
  )
}
