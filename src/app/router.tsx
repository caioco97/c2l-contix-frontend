import { createBrowserRouter } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { GuestOnly, RequireAuth } from '@/features/auth/components/RequireAuth'
import { ForgotPasswordPage } from '@/features/auth/pages/ForgotPasswordPage'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { ResetPasswordPage } from '@/features/auth/pages/ResetPasswordPage'
import { NotFoundPage } from './NotFoundPage'

// Telas autenticadas são carregadas sob demanda (code splitting por rota).
export const router = createBrowserRouter([
  {
    element: <GuestOnly />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/esqueci-senha', element: <ForgotPasswordPage /> },
    ],
  },
  { path: '/redefinir-senha', element: <ResetPasswordPage /> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, lazy: () => import('@/features/home/HomePage').then((m) => ({ Component: m.HomePage })) },
          {
            path: 'documentos/:folderId?',
            lazy: () => import('@/features/documents/DocumentsPage').then((m) => ({ Component: m.DocumentsPage })),
          },
          {
            path: 'portal',
            lazy: () => import('@/features/requests/pages/PortalLayout').then((m) => ({ Component: m.PortalLayout })),
            children: [
              {
                index: true,
                lazy: () => import('@/features/requests/pages/CatalogPage').then((m) => ({ Component: m.CatalogPage })),
              },
              {
                path: 'solicitacoes',
                lazy: () => import('@/features/requests/pages/MyRequestsPage').then((m) => ({ Component: m.MyRequestsPage })),
              },
              {
                path: 'solicitacoes/nova/:typeCode',
                lazy: () => import('@/features/requests/pages/NewRequestPage').then((m) => ({ Component: m.NewRequestPage })),
              },
              {
                path: 'nfe',
                lazy: () =>
                  import('@/features/requests/pages/ComingSoonPage').then((m) => ({
                    Component: () => <m.ComingSoonPage title="Manifestação de NF-e" />,
                  })),
              },
              {
                path: 'relatorios',
                lazy: () =>
                  import('@/features/requests/pages/ComingSoonPage').then((m) => ({
                    Component: () => <m.ComingSoonPage title="Relatórios" />,
                  })),
              },
            ],
          },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
])
