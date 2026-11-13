import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { BellRing, Building2, ChevronDown, CircleHelp, ClipboardCheck, Headset, Home, FolderOpen, LayoutGrid, LogOut, Megaphone, Menu, ShieldCheck, UserRound, X } from 'lucide-react'
import { Avatar, Button, DropdownMenu, MenuItem } from '@/components/ui'
import { useAuth } from '@/features/auth/AuthContext'
import { cn } from '@/lib/cn'
import { NotificationBell } from '@/features/notifications/components/NotificationBell'
import { useModuleAccess } from '@/features/companies/useModuleAccess'
import type { PortalModule } from '@/types/domain'
import { Logo } from './Logo'

type Audience = 'office' | 'client'

interface NavItem {
  to: string
  label: string
  icon: typeof Home
  end?: boolean
  /**
   * Quem vê o menu. O escritório (administrador e colaborador) só vê menus de controle das empresas;
   * o cliente só vê o portal. Sem valor, aparece para os dois.
   */
  audience?: Audience
  /** Para o cliente: aparece se algum destes módulos estiver liberado. */
  modules?: PortalModule[]
}

const NAV: NavItem[] = [
  { to: '/', label: 'Início', icon: Home, end: true, audience: 'client' },
  { to: '/empresas', label: 'Empresas', icon: Building2, audience: 'office' },
  { to: '/documentos', label: 'Documentos', icon: FolderOpen, modules: ['Documentos'] },
  { to: '/atendimento', label: 'Atendimento', icon: Headset, audience: 'office' },
  { to: '/tarefas', label: 'Tarefas', icon: ClipboardCheck, audience: 'office' },
  { to: '/certidoes', label: 'CND', icon: ShieldCheck },
  { to: '/portal', label: 'Portal do Cliente', icon: LayoutGrid, audience: 'client', modules: ['Solicitacoes', 'NFe'] },
  { to: '/noticias', label: 'Notícias', icon: Megaphone, audience: 'office' },
]

export function AppHeader() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const { can } = useModuleAccess()
  const audience: Audience = user?.role === 'Client' ? 'client' : 'office'
  const nav = NAV.filter(
    (n) => (!n.audience || n.audience === audience) && (!n.modules || n.modules.some((m) => can(m))),
  )

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={() => setMobileOpen((o) => !o)}
          aria-label={mobileOpen ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>

        <NavLink to="/" aria-label="Contix — Início" className="shrink-0">
          {user?.office.logoUrl ? (
            <img src={user.office.logoUrl} alt={user.office.name} className="h-10 w-auto" />
          ) : (
            <Logo />
          )}
        </NavLink>

        <nav aria-label="Principal" className="mx-auto hidden h-full lg:flex">
          {nav.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'relative flex items-center whitespace-nowrap px-3 text-sm font-semibold uppercase tracking-wide transition-colors xl:px-5',
                  isActive
                    ? 'text-brand-700 after:absolute after:inset-x-3 after:bottom-0 after:h-[3px] after:rounded-t after:bg-brand-600'
                    : 'text-slate-600 hover:text-ink',
                )
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1 lg:ml-0">
          <NotificationBell />
          <Button variant="ghost" size="icon" aria-label="Ajuda" className="hidden sm:inline-flex">
            <CircleHelp className="h-5 w-5" />
          </Button>

          {user && (
            <DropdownMenu
              trigger={({ toggle, open }) => (
                <button
                  type="button"
                  onClick={toggle}
                  aria-expanded={open}
                  aria-haspopup="menu"
                  className="ml-1 flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50"
                >
                  <Avatar name={user.name} className="h-8 w-8" />
                  <span className="hidden text-left leading-tight xl:block">
                    <span className="block text-sm font-medium text-ink">{user.name}</span>
                    <span className="block max-w-44 truncate text-xs text-slate-500">{user.office.name}</span>
                  </span>
                  <ChevronDown className="hidden h-4 w-4 text-slate-400 xl:block" />
                </button>
              )}
            >
              {(close) => (
                <>
                  <div className="border-b border-slate-100 px-3 py-2">
                    <p className="text-sm font-medium text-ink">{user.name}</p>
                    <p className="text-xs text-slate-500">{user.email}</p>
                  </div>
                  <MenuItem icon={<UserRound className="h-4 w-4" />} onClick={close}>
                    Meu perfil
                  </MenuItem>
                  <MenuItem
                    icon={<BellRing className="h-4 w-4" />}
                    onClick={() => {
                      close()
                      navigate('/notificacoes')
                    }}
                  >
                    Notificações
                  </MenuItem>
                  <MenuItem
                    icon={<LogOut className="h-4 w-4" />}
                    onClick={() => {
                      close()
                      void handleLogout()
                    }}
                  >
                    Sair
                  </MenuItem>
                </>
              )}
            </DropdownMenu>
          )}
        </div>
      </div>

      {mobileOpen && (
        <nav aria-label="Principal (móvel)" className="border-t border-slate-100 bg-white px-2 py-2 lg:hidden">
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium',
                  isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-700 hover:bg-slate-50',
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
      )}
    </header>
  )
}
