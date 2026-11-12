import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Spinner } from '@/components/ui'
import { useActiveCompany } from '@/features/companies/ActiveCompanyContext'
import { RequestDetail } from '../components/RequestDetail'

export function PortalRequestPage() {
  const { requestId = '' } = useParams()
  const { company } = useActiveCompany()
  if (!company) return <Spinner className="py-20" />
  return (
    <div className="space-y-4">
      <Link to="/portal/solicitacoes" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline">
        <ArrowLeft className="h-4 w-4" />
        Minhas solicitações
      </Link>
      <RequestDetail companyId={company.id} requestId={requestId} />
    </div>
  )
}
