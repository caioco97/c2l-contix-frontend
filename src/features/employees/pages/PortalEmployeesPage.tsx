import { useActiveCompany } from '@/features/companies/ActiveCompanyContext'
import { EmployeesPanel } from '../components/EmployeesPanel'

/** Portal do cliente: empregados da empresa ativa (somente consulta). */
export function PortalEmployeesPage() {
  const { company } = useActiveCompany()
  if (!company) return null
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-ink">Empregados</h1>
        <p className="text-sm text-slate-500">
          Quem aparece aqui pode ser escolhido nas solicitações de férias, rescisão, afastamento e rubricas. Clique em um
          empregado para ver os detalhes, férias e afastamentos. Para incluir alguém, envie uma solicitação de cadastro.
        </p>
      </div>
      <EmployeesPanel key={company.id} companyId={company.id} requestHref={(id) => `/portal/solicitacoes/${id}`} />
    </div>
  )
}
