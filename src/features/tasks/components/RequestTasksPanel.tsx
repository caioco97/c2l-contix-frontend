import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ClipboardPlus } from 'lucide-react'
import { Badge, Button, Card, CardBody, useToast } from '@/components/ui'
import { getErrorMessage } from '@/lib/api'
import { formatDate } from '@/lib/format'
import type { ServiceRequestDetail, TaskInput } from '@/types/domain'
import { taskKeys, tasksApi } from '../api'
import { taskHref, taskStatusMeta } from '../meta'
import { TaskFormModal } from './TaskFormModal'

/** Tarefas internas abertas a partir da solicitação, e o atalho para criar uma nova já vinculada. */
export function RequestTasksPanel({ request: r, companyId }: { request: ServiceRequestDetail; companyId: string }) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const [creating, setCreating] = useState(false)
  const tasks = useQuery({
    queryKey: taskKeys.ofRequest(companyId, r.id),
    queryFn: () => tasksApi.listOfRequest(companyId, r.id),
  })

  const prefill = useMemo<Partial<TaskInput>>(
    () => ({
      title: `${r.typeName}: ${r.subject}`.slice(0, 200),
      description: `Aberta a partir da solicitação #${r.number}.`,
      department: r.department,
      requestId: r.id,
    }),
    [r.id, r.number, r.typeName, r.subject, r.department],
  )

  const create = useMutation({
    mutationFn: ({ input, files }: { input: TaskInput; files: File[] }) => tasksApi.create(companyId, input, files),
    onSuccess: (t) => {
      toast.success(`Tarefa #${t.number} criada.`)
      queryClient.invalidateQueries({ queryKey: taskKeys.all })
      setCreating(false)
    },
    onError: (e) => toast.error(getErrorMessage(e, 'Não foi possível criar a tarefa.')),
  })

  const items = tasks.data ?? []
  return (
    <Card>
      <CardBody className="space-y-3">
        <h2 className="text-xs font-medium uppercase tracking-wide text-slate-500">Tarefas internas</h2>
        {items.length > 0 && (
          <ul className="space-y-2 text-sm">
            {items.map((t) => (
              <li key={t.id}>
                <Link to={taskHref(t)} className="block rounded-lg border border-slate-200 px-3 py-2 hover:border-brand-300">
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate font-medium text-ink">
                      #{t.number} {t.title}
                    </span>
                    <Badge tone={taskStatusMeta[t.status].tone}>{taskStatusMeta[t.status].label}</Badge>
                  </span>
                  <span className="text-xs text-slate-500">
                    {t.assigneeName} · prazo {formatDate(t.internalDueDate)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <Button variant="secondary" className="w-full justify-center" onClick={() => setCreating(true)}>
          <ClipboardPlus className="h-4 w-4" /> Criar tarefa
        </Button>
      </CardBody>
      <TaskFormModal
        open={creating}
        companyId={companyId}
        prefill={prefill}
        onClose={() => setCreating(false)}
        onSubmit={(_, input, files) =>
          create.mutateAsync({ input, files }).then(
            () => undefined,
            () => undefined,
          )
        }
      />
    </Card>
  )
}
