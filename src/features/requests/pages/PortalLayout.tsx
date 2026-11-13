import { Outlet } from 'react-router-dom'
import { CompanyContextBar, CompanyGate } from '@/features/companies/CompanySelector'
import { PortalSidebar } from '../components/PortalSidebar'

export function PortalLayout() {
  return (
    <>
      <CompanyContextBar />
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[260px_1fr]">
        <PortalSidebar />
        <div className="min-w-0">
          <CompanyGate purpose="abrir e acompanhar as solicitações">{() => <Outlet />}</CompanyGate>
        </div>
      </div>
    </>
  )
}
