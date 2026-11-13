import { useEffect, useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { ClipboardList, Plus, Search } from 'lucide-react'
import { Button, Card, Checkbox, EmptyState, Input, Select, Skeleton, Tabs, useToast } from '@/components/ui'
import { useAuth } from '@/features/auth/AuthContext'
import { companiesApi } from '@/features/companies/api'
import { requestKeys, requestsApi } from '@/features/requests/api'
import { Pager } from '@/features/requests/components/RequestsTable'
import { DEPARTMENTS } from '@/features/requests/meta'
import { getErrorMessage } from '@/lib/api'
import type { Department, TaskInput } from '@/types/domain'
import { taskKeys, tasksApi, type TaskFilters } from '../api'
import { TaskFormModal } from '../components/TaskFormModal'
import { TasksTable } from '../components/TasksTable'
import { taskHref } from '../meta'

type View = 'mine' | 'week' | 'open' | 'done' | 'all'
const PAGE_SIZE = 20

function useDebounced<T>(value: T, ms = 300) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}

const inDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10)

/** Tarefas internas do escritório, de todas as empresas, ordenadas pelo prazo interno. */
export function TasksPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [view, setView] = useState<View>('mine')
  const [companyId, setCompanyId] = useState('')
  const [department, setDepartment] = useState('')
  const [assigneeId, setAssigneeId] = useState('')
  const [overdue, setOverdue] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [creating, setCreating] = useState(false)
  const debouncedSearch = useDebounced(search)

  const companies = useQuery({ queryKey: ['companies', 'mine'], queryFn: companiesApi.listMine })
  const users = useQuery({ queryKey: requestKeys.officeUsers, queryFn: requestsApi.officeUsers, staleTime: 5 * 60_000 })

  const filters: TaskFilters = {
    open: view !== 'done' && view !== 'all' ? true : undefined,
    status: view === 'done' ? 'Done' : undefined,
    assigneeId: view === 'mine' ? user?.id : assigneeId || undefined,
    dueUntil: view === 'week' ? inDays(7) : undefined,
    companyId: companyId || undefined,
    department: (department || undefined) as Department | undefined,
    overdue: overdue || undefined,
    search: debouncedSearch,
    sortBy: view === 'done' || view === 'all' ? 'prazo' : undefined,
    sortDesc: view === 'done' || view === 'all' || undefined,
    page,
    pageSize: PAGE_SIZE,
  }
  const { data, isLoading } = useQuery({
    queryKey: taskKeys.list(filters),
    queryFn: () => tasksApi.list(filters),
    placeholderData: keepPreviousData,
  })
  const items = data?.items ?? []
  const reset = <T,>(set: (v: T) => void) => (v: T) => {
    set(v)
    setPage(1)
  }

  const create = useMutation({
    mutationFn: ({ companyId: c, input, files }: { companyId: string; input: TaskInput; files: File[] }) =>
      tasksApi.create(c, input, files),
    onSuccess: (task) => {
      toast.success(`Tarefa #${task.number} criada.`)
      queryClient.invalidateQueries({ queryKey: taskKeys.all })
      setCreating(false)
      navigate(taskHref(task))
    },
    onError: (e) => toast.error(getErrorMessage(e, 'Não foi possível criar a tarefa.')),
  })

  return (
    <div className="mx-auto max-w-[1600px] space-y-4 px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink">Tarefas</h1>
          <p className="text-sm text-slate-500">Trabalho interno do escritório por empresa, com prazo interno e prazo legal.</p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" /> Nova tarefa
        </Button>
      </div>

      <Tabs
        className="overflow-x-auto"
        items={[
          { value: 'mine', label: 'Minhas' },
          { value: 'week', label: 'Vencem em 7 dias' },
          { value: 'open', label: 'Em aberto' },
          { value: 'done', label: 'Concluídas' },
          { value: 'all', label: 'Todas' },
        ]}
        value={view}
        onChange={reset(setView)}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_auto]">
        <Input
          aria-label="Buscar por número ou título"
          placeholder="Nº ou título"
          leftIcon={<Search className="h-4 w-4" />}
          value={search}
          onChange={(e) => reset(setSearch)(e.target.value)}
        />
        <Select
          aria-label="Empresa"
          placeholder="Todas as empresas"
          value={companyId}
          onChange={(e) => reset(setCompanyId)(e.target.value)}
          options={(companies.data ?? []).map((c) => ({ value: c.id, label: c.tradeName || c.legalName }))}
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
          disabled={view === 'mine'}
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
            <EmptyState icon={<ClipboardList className="h-8 w-8" />} title="Nenhuma tarefa encontrada." />
          </div>
        ) : (
          <>
            <TasksTable showCompany items={items} />
            <Pager page={page} total={data?.total ?? 0} pageSize={PAGE_SIZE} onPage={setPage} />
          </>
        )}
      </Card>

      <TaskFormModal
        open={creating}
        onClose={() => setCreating(false)}
        onSubmit={(c, input, files) => create.mutateAsync({ companyId: c, input, files }).then(() => undefined, () => undefined)}
      />
    </div>
  )
}
