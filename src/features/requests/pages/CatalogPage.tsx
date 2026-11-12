import { useQuery } from '@tanstack/react-query'
import { Skeleton } from '@/components/ui'
import { useActiveCompany } from '@/features/companies/ActiveCompanyContext'
import { requestKeys, requestsApi } from '../api'
import { RequestTypeCard } from '../components/RequestTypeCard'

export function CatalogPage() {
  const { company } = useActiveCompany()
  const companyId = company?.id ?? ''
  const { data = [], isLoading } = useQuery({
    queryKey: requestKeys.types(companyId),
    queryFn: () => requestsApi.types(companyId),
    enabled: !!companyId,
  })

  const groups = [
    { title: 'Solicitação de Serviço', items: data.filter((t) => t.group === 'service') },
    { title: 'Manifestação de NF-e', items: data.filter((t) => t.group === 'nfe') },
  ]

  return (
    <div className="space-y-8">
      {groups.map((g) => (
        <section key={g.title}>
          <h1 className="mb-4 text-xl font-semibold text-ink">{g.title}</h1>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {isLoading
              ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-44 rounded-xl" />)
              : g.items.map((t) => <RequestTypeCard key={t.id} type={t} />)}
          </div>
        </section>
      ))}
    </div>
  )
}
