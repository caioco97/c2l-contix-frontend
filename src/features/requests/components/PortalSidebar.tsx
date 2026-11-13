import { NavLink } from 'react-router-dom'
import { BarChart3, ClipboardList, Inbox, ReceiptText } from 'lucide-react'
import { Avatar } from '@/components/ui'
import { useActiveCompany } from '@/features/companies/ActiveCompanyContext'
import { cn } from '@/lib/cn'
import { useModuleAccess } from '@/features/companies/useModuleAccess'
import type { PortalModule } from '@/types/domain'

const LINKS: { to: string; label: string; icon: typeof Inbox; end?: boolean; module: PortalModule }[] = [
  { to: '/portal', label: 'Solicitação de Serviço', icon: ClipboardList, end: true, module: 'Solicitacoes' },
  { to: '/portal/solicitacoes', label: 'Minhas solicitações', icon: Inbox, module: 'Solicitacoes' },
  { to: '/portal/nfe', label: 'Manifestação de NF-e', icon: ReceiptText, module: 'NFe' },
  { to: '/portal/relatorios', label: 'Relatórios', icon: BarChart3, module: 'Solicitacoes' },
]

export function PortalSidebar() {
  const { company } = useActiveCompany()
  const { can } = useModuleAccess()
  const links = LINKS.filter((l) => can(l.module))
  return (
    <aside className="rounded-xl border border-slate-200 bg-white lg:self-start">
      {company && (
        <div className="flex items-center gap-3 border-b border-slate-100 p-4">
          <Avatar name={company.tradeName} className="bg-slate-600 text-white" />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Empresa</p>
            <p className="truncate text-sm font-semibold text-ink">{company.legalName}</p>
            <p className="text-xs text-slate-500">{company.nickname}</p>
          </div>
        </div>
      )}
      <nav aria-label="Portal do cliente" className="flex gap-1 overflow-x-auto p-2 lg:flex-col">
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
                isActive ? 'bg-brand-50 font-semibold text-brand-800' : 'text-slate-700 hover:bg-slate-50',
              )
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
