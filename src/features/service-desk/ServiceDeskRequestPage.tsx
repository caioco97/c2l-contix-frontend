import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { RequestDetail } from '@/features/requests/components/RequestDetail'

export function ServiceDeskRequestPage() {
  const { companyId = '', requestId = '' } = useParams()
  return (
    <div className="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6">
      <Link to="/atendimento" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline">
        <ArrowLeft className="h-4 w-4" />
        Atendimento
      </Link>
      <RequestDetail companyId={companyId} requestId={requestId} />
    </div>
  )
}
