import { useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { CalendarClock, ClipboardList, Plus, Search } from 'lucide-react'
import { Button, Card, Checkbox, EmptyState, Input, Select, SegmentedControl, Skeleton, Tabs, useToast } from '@/components/ui'
import { useAuth } from '@/features/auth/AuthContext'
import { companiesApi } from '@/features/companies/api'
import { requestKeys, requestsApi } from '@/features/requests/api'
import { Pager } from '@/features/requests/components/RequestsTable'
import { DEPARTMENTS } from '@/features/requests/meta'
import { getErrorMessage } from '@/lib/api'
import { useDebounced } from '@/lib/useDebounced'
import type { Department, TaskInput } from '@/types/domain'
import { taskKeys, tasksApi, type TaskFilters } from '../api'
import { TaskFormModal } from '../components/TaskFormModal'
import { TasksTable } from '../components/TasksTable'
import { TasksBoard } from '../components/TasksBoard'
import { taskHref } from '../meta'

type View = 'mine' | 'week' | 'open' | 'done' | 'all'
const PAGE_SIZE = 20

type Layout = 'list' | 'board'
const LAYOUT_KEY = 'contix.tasks.layout'

function readLayout(): Layout {
  try {
    return localStorage.getItem(LAYOUT_KEY) === 'board' ? 'board' : 'list'
  } catch {
    return 'list'
  }
}

/** Primeiro e último dia do mês (yyyy-MM). */
function monthRange(month: string) {
  if (!month) return { from: undefined, until: undefined }
  const [y, m] = month.split('-').map(Number)
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate()
  return { from: `${month}-01`, until: `${month}-${String(last).padStart(2, '0')}` }
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
  const [month, setMonth] = useState('')
  const [layout, setLayoutState] = useState<Layout>(readLayout)
  const [onlyMine, setOnlyMine] = useState(true)
  const debouncedSearch = useDebounced(search)
  const setLayout = (l: Layout) => {
    setLayoutState(l)
    try {
      localStorage.setItem(LAYOUT_KEY, l)
    } catch {
      /* preferência só nesta sessão */
    }
  }
  const range = monthRange(month)

  const companies = useQuery({ queryKey: ['companies', 'mine'], queryFn: companiesApi.listMine })
  const users = useQuery({ queryKey: requestKeys.officeUsers, queryFn: requestsApi.officeUsers, staleTime: 5 * 60_000 })

  const mineLocked = layout === 'list' ? view === 'mine' : onlyMine
  const filters: TaskFilters = {
    open: view !== 'done' && view !== 'all' ? true : undefined,
    status: view === 'done' ? 'Done' : undefined,
    assigneeId: view === 'mine' ? user?.id : assigneeId || undefined,
    dueUntil: view === 'week' ? (range.until && range.until < inDays(7) ? range.until : inDays(7)) : range.until,
    dueFrom: range.from,
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
    enabled: layout === 'list',
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
        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl
            items={[
              { value: 'list', label: 'Lista' },
              { value: 'board', label: 'Quadro' },
            ]}
            value={layout}
            onChange={setLayout}
          />
          <Link
            to="/tarefas/obrigacoes"
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-ink hover:bg-slate-50"
          >
            <CalendarClock className="h-4 w-4" /> Obrigações
          </Link>
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> Nova tarefa
          </Button>
        </div>
      </div>

      {layout === 'list' && (
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
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_160px_auto]">
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
          value={mineLocked ? (user?.id ?? '') : assigneeId}
          disabled={mineLocked}
          onChange={(e) => reset(setAssigneeId)(e.target.value)}
          options={(users.data ?? []).map((u) => ({ value: u.id, label: u.name }))}
        />
        <Input
          type="month"
          aria-label="Mês do prazo interno"
          title="Mês do prazo interno"
          value={month}
          onChange={(e) => reset(setMonth)(e.target.value)}
        />
        <div className="flex flex-col justify-center gap-1">
          <label className="flex items-center gap-2 whitespace-nowrap text-sm text-slate-700">
            <Checkbox checked={overdue} onChange={(e) => reset(setOverdue)(e.target.checked)} />
            Só atrasadas
          </label>
          {layout === 'board' && (
            <label className="flex items-center gap-2 whitespace-nowrap text-sm text-slate-700">
              <Checkbox checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} />
              Só as minhas
            </label>
          )}
        </div>
      </div>

      {layout === 'board' ? (
        <TasksBoard
          filters={{
            assigneeId: onlyMine ? user?.id : assigneeId || undefined,
            companyId: companyId || undefined,
            department: (department || undefined) as Department | undefined,
            overdue: overdue || undefined,
            search: debouncedSearch,
            dueFrom: range.from,
            dueUntil: range.until,
          }}
        />
      ) : (
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
            <Pager page={page} total={data?.total ?? 0} pageSize={PAGE_SIZE} onPage={setPage} noun={['tarefa', 'tarefas']} />
          </>
        )}
      </Card>
      )}

      <TaskFormModal
        open={creating}
        onClose={() => setCreating(false)}
        onSubmit={(c, input, files) => create.mutateAsync({ companyId: c, input, files }).then(() => undefined, () => undefined)}
      />
    </div>
  )
}
