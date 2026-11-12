import { Outlet } from 'react-router-dom'
import { ActiveCompanyProvider } from '@/features/companies/ActiveCompanyContext'
import { AppHeader } from './AppHeader'

export function AppLayout() {
  return (
    <ActiveCompanyProvider>
      <div className="flex min-h-full flex-col">
        <AppHeader />
        <div className="flex-1">
          <Outlet />
        </div>
        <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
          Contix · Plataforma de gestão contábil
        </footer>
      </div>
    </ActiveCompanyProvider>
  )
}
