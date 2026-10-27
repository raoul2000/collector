import { Navigate, type RouteObject } from 'react-router'
import { AdminLayout } from '../features/admin/AdminLayout'
import { CampagnesPage } from '../features/admin/campagnes/CampagnesPage'
import { CategoriesPage } from '../features/admin/categories/CategoriesPage'
import { LoginPage } from '../features/admin/LoginPage'
import { MagasinsPage } from '../features/admin/magasins/MagasinsPage'
import { BenevoleLayout } from '../features/benevole/BenevoleLayout'
import { SaisiePage } from '../features/saisie/SaisiePage'
import { NotFoundPage } from './NotFoundPage'

/**
 * Une seule application : espace bénévole sur « / », espace responsable sur « /admin ».
 */
export const routes: RouteObject[] = [
  {
    path: '/',
    element: <BenevoleLayout />,
    children: [{ index: true, element: <SaisiePage /> }],
  },
  { path: '/admin/connexion', element: <LoginPage /> },
  {
    path: '/admin',
    element: <AdminLayout />,
    children: [
      { index: true, element: <Navigate to="campagnes" replace /> },
      { path: 'campagnes', element: <CampagnesPage /> },
      { path: 'magasins', element: <MagasinsPage /> },
      { path: 'categories', element: <CategoriesPage /> },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]
