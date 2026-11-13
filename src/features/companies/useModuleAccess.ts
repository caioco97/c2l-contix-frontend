import { useAuth } from '@/features/auth/AuthContext'
import type { PortalModule } from '@/types/domain'
import { useActiveCompany } from './ActiveCompanyContext'

/**
 * Módulos do portal liberados para o usuário na empresa ativa.
 * O escritório acessa tudo; o usuário do cliente, o que foi liberado no convite.
 */
export function useModuleAccess() {
  const { user } = useAuth()
  const { company } = useActiveCompany()
  const can = (module: PortalModule) =>
    !user || user.role !== 'Client' || !company?.modules || company.modules.includes(module)
  return { can }
}
