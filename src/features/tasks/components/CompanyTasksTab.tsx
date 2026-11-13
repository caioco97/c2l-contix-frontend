import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ClipboardList, Plus } from 'lucide-react'
import { Button, Card, CardHeader, EmptyState, SegmentedControl, Skeleton, useToast } from '@/components/ui'
import { Pager } from '@/features/requests/components/RequestsTable'
import { getErrorMessage } from '@/lib/api'
import type { TaskInput } from '@/types/domain'
import { taskKeys, tasksApi, type TaskFilters } from '../api'
import { TaskFormModal } from './TaskFormModal'
import { TasksTable } from './TasksTable'

const PAGE_SIZE = 15

/** Aba Tarefas da página da empresa. */
export function CompanyTasksTab({ companyId }: { companyId: string }) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [scope, setScope] = useState<'open' | 'all'>('open')
  const [creating, setCreating] = useState(false)
  const f: TaskFilters = {
    open: scope === 'open' || undefined,
    sortBy: scope === 'all' ? 'prazo' : undefined,
    sortDesc: scope === 'all' || undefined,
    page,
    pageSize: PAGE_SIZE,
  }
  const { data, isLoading } = useQuery({ queryKey: taskKeys.ofCompany(companyId, f), queryFn: () => tasksApi.listOfCompany(companyId, f) })
  const items = data?.items ?? []

  const create = useMutation({
    mutationFn: ({ input, files }: { input: TaskInput; files: File[] }) => tasksApi.create(companyId, input, files),
    onSuccess: (task) => {
      toast.success(`Tarefa #${task.number} criada.`)
      queryClient.invalidateQueries({ queryKey: taskKeys.all })
      queryClient.invalidateQueries({ queryKey: ['companies', 'panel', companyId] })
      setCreating(false)
    },
    onError: (e) => toast.error(getErrorMessage(e, 'Não foi possível criar a tarefa.')),
  })

  return (
    <Card className="overflow-hidden">
      <CardHeader
        className="pb-4"
        title="Tarefas"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <SegmentedControl
              value={scope}
              onChange={(v) => {
                setScope(v)
                setPage(1)
              }}
              items={[
                { value: 'open', label: 'Em aberto' },
                { value: 'all', label: 'Todas' },
              ]}
            />
            <Button size="sm" onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" /> Nova tarefa
            </Button>
          </div>
        }
      />
      {isLoading ? (
        <div className="space-y-2 p-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-10" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="p-6">
          <EmptyState
            icon={<ClipboardList className="h-8 w-8" />}
            title={scope === 'open' ? 'Nenhuma tarefa em aberto.' : 'Nenhuma tarefa criada para esta empresa.'}
          />
        </div>
      ) : (
        <>
          <TasksTable items={items} />
          <Pager page={page} total={data?.total ?? 0} pageSize={PAGE_SIZE} onPage={setPage} />
        </>
      )}

      <TaskFormModal
        open={creating}
        companyId={companyId}
        onClose={() => setCreating(false)}
        onSubmit={(_, input, files) => create.mutateAsync({ input, files }).then(() => undefined, () => undefined)}
      />
    </Card>
  )
}
