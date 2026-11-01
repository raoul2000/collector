import { Navigate, type RouteObject } from 'react-router'
import { BenevoleLayout } from '../features/benevole/BenevoleLayout'
import { CollectePage } from '../features/benevole/CollectePage'
import { MesSaisiesPage } from '../features/benevole/MesSaisiesPage'
import { ParametresPage } from '../features/benevole/ParametresPage'
import { SaisiePage } from '../features/saisie/SaisiePage'
import { ErrorPage } from './ErrorPage'
import { NotFoundPage } from './NotFoundPage'

/**
 * Une seule application : espace bénévole sur « / », espace responsable sur « /admin ».
 *
 * L'espace responsable est chargé à la demande : les bénévoles ne téléchargent pas son code
 * au démarrage (il reste disponible hors ligne grâce au service worker).
 */
export const routes: RouteObject[] = [
  {
    path: '/',
    element: <BenevoleLayout />,
    errorElement: <ErrorPage />,
    children: [
      { index: true, element: <SaisiePage /> },
      { path: 'mes-saisies', element: <MesSaisiesPage /> },
      { path: 'collecte', element: <CollectePage /> },
      { path: 'parametres', element: <ParametresPage /> },
    ],
  },
  {
    path: '/admin/connexion',
    lazy: async () => ({ Component: (await import('../features/admin/LoginPage')).LoginPage }),
    errorElement: <ErrorPage />,
  },
  {
    path: '/admin',
    lazy: async () => ({ Component: (await import('../features/admin/AdminLayout')).AdminLayout }),
    errorElement: <ErrorPage />,
    children: [
      { index: true, element: <Navigate to="bilans" replace /> },
      {
        path: 'bilans',
        lazy: async () => ({ Component: (await import('../features/admin/bilans/BilansPage')).BilansPage }),
      },
      {
        path: 'bilans/aida',
        lazy: async () => ({ Component: (await import('../features/admin/bilans/ReceptionAidaPage')).ReceptionAidaPage }),
      },
      {
        path: 'campagnes',
        lazy: async () => ({ Component: (await import('../features/admin/campagnes/CampagnesPage')).CampagnesPage }),
      },
      {
        path: 'magasins',
        lazy: async () => ({ Component: (await import('../features/admin/magasins/MagasinsPage')).MagasinsPage }),
      },
      {
        path: 'categories',
        lazy: async () => ({ Component: (await import('../features/admin/categories/CategoriesPage')).CategoriesPage }),
      },
      {
        path: 'saisies',
        lazy: async () => ({ Component: (await import('../features/admin/saisies/SaisiesPage')).SaisiesPage }),
      },
      {
        path: 'appareils',
        lazy: async () => ({ Component: (await import('../features/admin/appareils/AppareilsPage')).AppareilsPage }),
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]
