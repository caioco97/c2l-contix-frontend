import { useEffect, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Inbox, Search } from 'lucide-react'
import { Card, Checkbox, EmptyState, Input, Select, Skeleton, Tabs } from '@/components/ui'
import { useAuth } from '@/features/auth/AuthContext'
import { companiesApi } from '@/features/companies/api'
import { requestKeys, requestsApi, type RequestFilters } from '@/features/requests/api'
import { Pager, RequestsTable } from '@/features/requests/components/RequestsTable'
import { useRequestTypes } from '@/features/requests/hooks'
import { DEPARTMENTS } from '@/features/requests/meta'
import type { Department, ServiceRequestStatus, ServiceRequestTypeCode } from '@/types/domain'

type View = 'mine' | 'unassigned' | 'waiting' | 'open' | 'all'
const PAGE_SIZE = 20

function useDebounced<T>(value: T, ms = 300) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}

/** Fila de atendimento do escritório: solicitações de todas as empresas. */
export function ServiceDeskPage() {
  const { user } = useAuth()
  const [view, setView] = useState<View>('open')
  const [companyId, setCompanyId] = useState('')
  const [typeCode, setTypeCode] = useState('')
  const [department, setDepartment] = useState('')
  const [assigneeId, setAssigneeId] = useState('')
  const [overdue, setOverdue] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebounced(search)

  const types = useRequestTypes()
  const companies = useQuery({ queryKey: ['companies', 'mine'], queryFn: companiesApi.listMine })
  const users = useQuery({ queryKey: requestKeys.officeUsers, queryFn: requestsApi.officeUsers, staleTime: 5 * 60_000 })

  const filters: RequestFilters = {
    inProgress: ['mine', 'unassigned', 'open'].includes(view) || undefined,
    status: view === 'waiting' ? ('WaitingClient' satisfies ServiceRequestStatus) : undefined,
    assigneeId: view === 'mine' ? user?.id : assigneeId || undefined,
    unassigned: view === 'unassigned' || undefined,
    companyId: companyId || undefined,
    typeCode: (typeCode || undefined) as ServiceRequestTypeCode | undefined,
    department: (department || undefined) as Department | undefined,
    overdue: overdue || undefined,
    search: debouncedSearch,
    sortBy: view === 'all' ? 'createdAt' : 'prazo',
    sortDesc: view === 'all',
    page,
    pageSize: PAGE_SIZE,
  }
  const { data, isLoading } = useQuery({
    queryKey: requestKeys.queue(filters),
    queryFn: () => requestsApi.queue(filters),
    placeholderData: keepPreviousData,
  })
  const items = data?.items ?? []
  const reset = <T,>(set: (v: T) => void) => (v: T) => {
    set(v)
    setPage(1)
  }

  return (
    <div className="mx-auto max-w-[1600px] space-y-4 px-4 py-6 sm:px-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">Atendimento</h1>
        <p className="text-sm text-slate-500">Solicitações de serviço de todas as empresas, ordenadas pelo prazo.</p>
      </div>

      <Tabs
        items={[
          { value: 'open', label: 'Em andamento' },
          { value: 'mine', label: 'Minhas' },
          { value: 'unassigned', label: 'Sem responsável' },
          { value: 'waiting', label: 'Aguardando cliente' },
          { value: 'all', label: 'Todas' },
        ]}
        value={view}
        onChange={reset(setView)}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr_auto]">
        <Input
          aria-label="Buscar por número ou assunto"
          placeholder="Nº ou assunto"
          leftIcon={<Search className="h-4 w-4" />}
          value={search}
          onChange={(e) => reset(setSearch)(e.target.value)}
        />
        <Select
          aria-label="Empresa"
          placeholder="Todas as empresas"
          value={companyId}
          onChange={(e) => reset(setCompanyId)(e.target.value)}
          options={(companies.data ?? []).map((c) => ({ value: c.id, label: c.tradeName }))}
        />
        <Select
          aria-label="Tipo"
          placeholder="Todos os tipos"
          value={typeCode}
          onChange={(e) => reset(setTypeCode)(e.target.value)}
          options={(types.data ?? []).map((t) => ({ value: t.code, label: t.name }))}
        />
        <Select
          aria-label="Departamento"
          placeholder="Todos os departamentos"
          value={department}
          onChange={(e) => reset(setDepartment)(e.target.value)}
          options={DEPARTMENTS}
        />
        <Select
          aria-label="Responsável"
          placeholder="Qualquer responsável"
          value={view === 'mine' ? (user?.id ?? '') : assigneeId}
          disabled={view === 'mine' || view === 'unassigned'}
          onChange={(e) => reset(setAssigneeId)(e.target.value)}
          options={(users.data ?? []).map((u) => ({ value: u.id, label: u.name }))}
        />
        <label className="flex items-center gap-2 whitespace-nowrap text-sm text-slate-700">
          <Checkbox checked={overdue} onChange={(e) => reset(setOverdue)(e.target.checked)} />
          Só atrasadas
        </label>
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="p-6">
            <EmptyState icon={<Inbox className="h-8 w-8" />} title="Nenhuma solicitação encontrada." />
          </div>
        ) : (
          <>
            <RequestsTable office items={items} hrefOf={(r) => `/atendimento/${r.companyId}/${r.id}`} />
            <Pager page={page} total={data?.total ?? 0} pageSize={PAGE_SIZE} onPage={setPage} />
          </>
        )}
      </Card>
    </div>
  )
}
