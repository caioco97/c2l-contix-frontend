import { createBrowserRouter, Navigate } from 'react-router-dom'
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
            element: <RequireModule module="NFe" />,
            children: [
              {
                path: 'nfe',
                lazy: () => import('@/features/nfe/NfePage').then((m) => ({ Component: m.NfePage })),
              },
            ],
          },
          {
            // Portal do Cliente: só o usuário do cliente. O escritório atende pelo menu Atendimento.
            element: <RequireAuth roles={['Client']} />,
            children: [
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
                path: 'empregados',
                lazy: () =>
                  import('@/features/employees/pages/PortalEmployeesPage').then((m) => ({ Component: m.PortalEmployeesPage })),
              },
              {
                path: 'solicitacoes/nova/:typeCode',
                lazy: () => import('@/features/requests/pages/NewRequestPage').then((m) => ({ Component: m.NewRequestPage })),
              },
              {
                path: 'relatorios',
                lazy: () => import('@/features/reports/PortalReportsPage').then((m) => ({ Component: m.PortalReportsPage })),
              },
                ],
              },
              {
                element: <RequireModule module="NFe" />,
                children: [
              {
                // Endereço antigo do portal: a tela de NF-e agora fica em /nfe.
                path: 'nfe',
                element: <Navigate to="/nfe" replace />,
              },
                ],
              },

            ],
          },
            ],
          },
          {
            element: <RequireAuth roles={['Admin', 'Collaborator']} />,
            children: [
              {
                path: 'painel',
                lazy: () => import('@/features/reports/DashboardPage').then((m) => ({ Component: m.DashboardPage })),
              },
              {
                path: 'relatorios',
                lazy: () => import('@/features/reports/ReportsPage').then((m) => ({ Component: m.ReportsPage })),
              },
              {
                path: 'equipe',
                lazy: () => import('@/features/team/pages/TeamPage').then((m) => ({ Component: m.TeamPage })),
              },
              {
                path: 'tarefas/obrigacoes',
                lazy: () => import('@/features/obligations/ObligationsPage').then((m) => ({ Component: m.ObligationsPage })),
              },
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
                path: 'tarefas',
                lazy: () => import('@/features/tasks/pages/TasksPage').then((m) => ({ Component: m.TasksPage })),
              },
              {
                path: 'tarefas/:companyId/:taskId',
                lazy: () => import('@/features/tasks/pages/TaskPage').then((m) => ({ Component: m.TaskPage })),
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
