import { Outlet } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { EmptyState } from '@/components/ui'
import type { PortalModule } from '@/types/domain'
import { moduleLabel } from './meta'
import { useModuleAccess } from './useModuleAccess'

/** Rota que só abre quando o módulo do portal está liberado ao usuário na empresa ativa. */
export function RequireModule({ module }: { module: PortalModule }) {
  const { can } = useModuleAccess()
  if (can(module)) return <Outlet />
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <EmptyState
        icon={<Lock className="h-6 w-6" />}
        title={`Sem acesso a ${moduleLabel(module)}`}
        description="Este módulo não foi liberado para o seu usuário nesta empresa. Fale com o escritório contábil se precisar dele."
      />
    </div>
  )
}
