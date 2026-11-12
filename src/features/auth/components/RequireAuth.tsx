import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Spinner } from '@/components/ui'
import type { UserRole } from '@/types/auth'
import { useAuth } from '../AuthContext'

/** Protege rotas: exige sessão e, opcionalmente, um dos perfis informados. */
export function RequireAuth({ roles }: { roles?: UserRole[] }) {
  const { status, user } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <Spinner className="h-screen" label="Carregando sua sessão…" />
  if (status === 'anonymous') return <Navigate to="/login" replace state={{ from: location }} />
  if (roles && user && !roles.includes(user.role)) return <Navigate to="/" replace />
  return <Outlet />
}

/** Rotas públicas (login etc.) redirecionam quem já está logado. */
export function GuestOnly() {
  const { status } = useAuth()
  if (status === 'loading') return <Spinner className="h-screen" />
  if (status === 'authenticated') return <Navigate to="/" replace />
  return <Outlet />
}
