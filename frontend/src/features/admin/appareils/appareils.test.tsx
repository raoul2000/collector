import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AppareilAdmin, Campagne, ListeAppareils, Magasin, PageSaisies, SaisieAdmin } from '../../../api/types'
import { fakeApi, SESSION_OK } from '../../../test/fakeApi'
import { renderApp } from '../../../test/renderApp'
import { derniereSynchro, moment } from './temps'

afterEach(() => {
  vi.unstubAllGlobals()
})

const MARIE_ID = 'a1a1a1a1-0000-4000-8000-000000000001'
const PAUL_ID = 'b2b2b2b2-0000-4000-8000-000000000002'

const CAMPAGNES: Campagne[] = [
  { id: 2, nom: 'Collecte 2026', dateDebut: '2026-11-27', dateFin: '2026-11-28', active: true, magasinIds: [4], nbSaisies: 2 },
]

const MAGASINS: Magasin[] = [{ id: 4, nom: 'Lidl', ville: 'Centre', actif: true, nbSaisies: 2 }]

const MARIE: AppareilAdmin = {
  id: MARIE_ID,
  prenom: 'Marie',
  magasinId: 4,
  nbSaisies: 42,
  nbArticles: 87,
  derniereSaisie: '2026-11-27T10:41:00+01:00',
  creeLe: '2026-11-27T08:02:00+01:00',
  vuLe: '2026-11-27T10:42:10+01:00',
  vuIlYaSecondes: 20,
  connecte: true,
}

const PAUL: AppareilAdmin = {
  ...MARIE,
  id: PAUL_ID,
  prenom: 'Paul',
  magasinId: null,
  nbSaisies: 0,
  nbArticles: 0,
  derniereSaisie: null,
  vuIlYaSecondes: 35 * 60,
  connecte: false,
}

const LISTE: ListeAppareils = { campagne: { id: 2, nom: 'Collecte 2026' }, connecteMinutes: 2, appareils: [MARIE, PAUL] }

describe('Appareils (responsable)', () => {
  it('liste les appareils de la campagne active avec leur dernière synchronisation', async () => {
    fakeApi({
      ...SESSION_OK,
      'GET /api/admin/campagnes': { body: CAMPAGNES },
      'GET /api/admin/magasins': { body: MAGASINS },
      'GET /api/admin/appareils': { body: LISTE },
    })
    renderApp('/admin/appareils')

    const lignes = (await screen.findAllByRole('row')).slice(1)
    expect(lignes[0]).toHaveTextContent('Marie')
    expect(lignes[0]).toHaveTextContent('a1a1a1a1')
    expect(lignes[0]).toHaveTextContent('Lidl – Centre')
    expect(within(lignes[0]!).getByText('Connecté')).toBeInTheDocument()
    expect(within(lignes[0]!).getByRole('link', { name: 'Voir les saisies de Marie (appareil a1a1a1a1)' })).toHaveAttribute(
      'href',
      `/admin/saisies?campagne=2&appareil=${MARIE_ID}`,
    )
    expect(lignes[1]).toHaveTextContent('il y a 35 min')
    // Sans saisie : ni magasin, ni lien
    expect(within(lignes[1]!).queryByRole('link')).not.toBeInTheDocument()
    expect(screen.getByText(/moins de 2 min/)).toBeInTheDocument()
  })

  it('ouvre les saisies filtrées sur un appareil, filtre que l’on peut retirer', async () => {
    const user = userEvent.setup()
    const saisie: SaisieAdmin = {
      id: 'c3c3c3c3-0000-4000-8000-000000000003', campagneId: 2, magasinId: 4, categorieId: 1, quantite: 1,
      contenanceUnitaire: 500, saisieLe: '2026-11-27T10:15:00+01:00', modifieLe: '2026-11-27T10:15:00.000+01:00',
      supprime: false, corrigeParResponsable: null, prenom: 'Marie', magasinNom: 'Lidl', categorieNom: 'Pâtes',
      unite: 'kg', codeAida: null, codeAVerifier: false, formatId: null, formatLibelle: null,
    }
    const page = (saisies: SaisieAdmin[]): { body: PageSaisies } => ({ body: { saisies, total: saisies.length, page: 1, parPage: 50 } })
    const api = fakeApi({
      ...SESSION_OK,
      'GET /api/admin/campagnes': { body: CAMPAGNES },
      'GET /api/admin/magasins': { body: MAGASINS },
      'GET /api/admin/categories': { body: [] },
      [`GET /api/admin/saisies?page=1&parPage=50&campagne=2&appareil=${MARIE_ID}`]: page([saisie]),
      'GET /api/admin/saisies?page=1&parPage=50&campagne=2': page([saisie, { ...saisie, id: 'd4', prenom: 'Paul' }]),
    })
    renderApp(`/admin/saisies?campagne=2&appareil=${MARIE_ID}`)

    await waitFor(() => expect(screen.getByText(/Saisies de l'appareil/)).toHaveTextContent("Saisies de l'appareil a1a1a1a1 (Marie)"))
    expect(api.calls.filter((c) => c.path.includes('admin/saisies')).map((c) => c.path)).toEqual([
      `/api/admin/saisies?page=1&parPage=50&campagne=2&appareil=${MARIE_ID}`,
    ])

    await user.click(screen.getByRole('button', { name: 'Retirer ce filtre' }))

    expect(await screen.findByText('2 saisies')).toBeInTheDocument()
    expect(screen.queryByText(/Saisies de l'appareil/)).not.toBeInTheDocument()
  })
})

describe('Dernière synchronisation', () => {
  it('donne le temps écoulé, puis l’heure', () => {
    const vuLe = '2026-11-27T08:05:00+01:00'
    expect(derniereSynchro({ connecte: true, vuIlYaSecondes: 20, vuLe })).toBe('Connecté')
    expect(derniereSynchro({ connecte: false, vuIlYaSecondes: 40, vuLe })).toBe('il y a moins d\'une minute')
    expect(derniereSynchro({ connecte: false, vuIlYaSecondes: 59 * 60, vuLe })).toBe('il y a 59 min')
    expect(derniereSynchro({ connecte: false, vuIlYaSecondes: 3 * 3600, vuLe })).toMatch(/^(à|le) /)
  })

  it('n’indique la date que pour un autre jour', () => {
    const maintenant = new Date('2026-11-27T15:00:00+01:00')
    expect(moment('2026-11-27T10:41:00+01:00', maintenant)).toBe('à 10:41')
    expect(moment('2026-11-26T18:12:00+01:00', maintenant)).toBe('le 26/11 à 18:12')
  })
})
