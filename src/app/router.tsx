import { createBrowserRouter } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { GuestOnly, RequireAuth } from '@/features/auth/components/RequireAuth'
import { ForgotPasswordPage } from '@/features/auth/pages/ForgotPasswordPage'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { ResetPasswordPage } from '@/features/auth/pages/ResetPasswordPage'
import { Spinner } from '@/components/ui'
import { RequireModule } from '@/features/companies/RequireModule'
import { NotFoundPage } from './NotFoundPage'

// Telas autenticadas são carregadas sob demanda (code splitting por rota).
export const router = createBrowserRouter([
  {
    // Exibido enquanto a primeira rota lazy carrega.
    hydrateFallbackElement: <Spinner className="py-20" />,
    children: [
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
            element: <RequireModule module="Documentos" />,
            children: [
              {
                path: 'documentos/:folderId?',
                lazy: () => import('@/features/documents/DocumentsPage').then((m) => ({ Component: m.DocumentsPage })),
              },
            ],
          },
          {
            path: 'notificacoes',
            lazy: () =>
              import('@/features/notifications/NotificationsPage').then((m) => ({ Component: m.NotificationsPage })),
          },
          {
            path: 'certidoes',
            lazy: () => import('@/features/cnd/CndPage').then((m) => ({ Component: m.CndPage })),
          },
          {
            path: 'portal',
            lazy: () => import('@/features/requests/pages/PortalLayout').then((m) => ({ Component: m.PortalLayout })),
            children: [
              {
                element: <RequireModule module="Solicitacoes" />,
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
                path: 'solicitacoes/:requestId',
                lazy: () => import('@/features/requests/pages/PortalRequestPage').then((m) => ({ Component: m.PortalRequestPage })),
              },
              {
                path: 'solicitacoes/nova/:typeCode',
                lazy: () => import('@/features/requests/pages/NewRequestPage').then((m) => ({ Component: m.NewRequestPage })),
              },
                ],
              },
              {
                element: <RequireModule module="NFe" />,
                children: [
              {
                path: 'nfe',
                lazy: () =>
                  import('@/features/requests/pages/ComingSoonPage').then((m) => ({
                    Component: () => <m.ComingSoonPage title="Manifestação de NF-e" />,
                  })),
              },
                ],
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
          {
            element: <RequireAuth roles={['Admin', 'Collaborator']} />,
            children: [
              {
                path: 'empresas',
                lazy: () => import('@/features/companies/pages/CompaniesPage').then((m) => ({ Component: m.CompaniesPage })),
              },
              {
                path: 'empresas/:companyId',
                lazy: () =>
                  import('@/features/companies/pages/CompanyDetailPage').then((m) => ({ Component: m.CompanyDetailPage })),
              },
              {
                path: 'noticias',
                lazy: () => import('@/features/news/NewsAdminPage').then((m) => ({ Component: m.NewsAdminPage })),
              },
              {
                path: 'atendimento',
                lazy: () => import('@/features/service-desk/ServiceDeskPage').then((m) => ({ Component: m.ServiceDeskPage })),
              },
              {
                path: 'atendimento/:companyId/:requestId',
                lazy: () =>
                  import('@/features/service-desk/ServiceDeskRequestPage').then((m) => ({ Component: m.ServiceDeskRequestPage })),
              },
            ],
          },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
    ],
  },
])
