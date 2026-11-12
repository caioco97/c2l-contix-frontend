import { useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Inbox, Plus } from 'lucide-react'
import { Button, Card, EmptyState, Skeleton, Tabs } from '@/components/ui'
import { useActiveCompany } from '@/features/companies/ActiveCompanyContext'
import { requestKeys, requestsApi, type RequestFilters } from '../api'
import { Pager, RequestsTable } from '../components/RequestsTable'

type View = 'open' | 'waiting' | 'all'
const PAGE_SIZE = 15

export function MyRequestsPage() {
  const { company } = useActiveCompany()
  const companyId = company?.id ?? ''
  const [view, setView] = useState<View>('open')
  const [page, setPage] = useState(1)

  const filters: RequestFilters = {
    inProgress: view === 'open' || undefined,
    status: view === 'waiting' ? 'WaitingClient' : undefined,
    page,
    pageSize: PAGE_SIZE,
  }
  const { data, isLoading } = useQuery({
    queryKey: requestKeys.list(companyId, filters),
    queryFn: () => requestsApi.list(companyId, filters),
    enabled: !!companyId,
    placeholderData: keepPreviousData,
  })
  const items = data?.items ?? []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-ink">Minhas solicitações</h1>
        <Link to="/portal">
          <Button size="sm">
            <Plus className="h-4 w-4" />
            Nova solicitação
          </Button>
        </Link>
      </div>
      <Tabs
        items={[
          { value: 'open', label: 'Em andamento' },
          { value: 'waiting', label: 'Aguardando você' },
          { value: 'all', label: 'Todas' },
        ]}
        value={view}
        onChange={(v) => {
          setView(v)
          setPage(1)
        }}
      />
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="space-y-2 p-4">
            <Skeleton className="h-8" />
            <Skeleton className="h-8" />
          </div>
        ) : items.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={<Inbox className="h-8 w-8" />}
              title={view === 'waiting' ? 'Nada aguardando você.' : 'Nenhuma solicitação para esta empresa.'}
            />
          </div>
        ) : (
          <>
            <RequestsTable items={items} hrefOf={(r) => `/portal/solicitacoes/${r.id}`} />
            <Pager page={page} total={data?.total ?? 0} pageSize={PAGE_SIZE} onPage={setPage} />
          </>
        )}
      </Card>
    </div>
  )
}
