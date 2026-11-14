import { useState } from 'react'
import { keepPreviousData, useMutation, useQueries, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { AlertTriangle, CalendarClock, MessageSquare, Paperclip } from 'lucide-react'
import { Skeleton, useToast } from '@/components/ui'
import { departmentLabels } from '@/features/requests/meta'
import { getErrorMessage } from '@/lib/api'
import { cn } from '@/lib/cn'
import { formatDate } from '@/lib/format'
import type { Task, TaskStatus } from '@/types/domain'
import { taskKeys, tasksApi, type TaskFilters } from '../api'
import { TASK_TRANSITIONS, taskHref, taskStatusMeta } from '../meta'
import { CompleteTaskModal } from './CompleteTaskModal'

const COLUMNS: TaskStatus[] = ['Pending', 'InProgress', 'Done']
/** Cartões por coluna: o quadro é para o dia a dia; a lista pagina o resto. */
const PER_COLUMN = 60

const ACCENT: Record<TaskStatus, string> = {
  Pending: 'bg-sky-500',
  InProgress: 'bg-brand-600',
  Done: 'bg-emerald-500',
  Canceled: 'bg-slate-400',
}

/**
 * Quadro (kanban) das tarefas: uma consulta paginada por coluna, com os mesmos filtros da lista.
 * Arrastar um cartão muda o status; soltar em "Concluída" abre a conclusão com entrega.
 */
export function TasksBoard({ filters }: { filters: Omit<TaskFilters, 'status' | 'open' | 'page' | 'pageSize'> }) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const [dragging, setDragging] = useState<Task | null>(null)
  const [over, setOver] = useState<TaskStatus | null>(null)
  const [completing, setCompleting] = useState<Task | null>(null)

  const columns = useQueries({
    queries: COLUMNS.map((status) => {
      const f: TaskFilters = { ...filters, status, page: 1, pageSize: PER_COLUMN, sortBy: 'prazo', sortDesc: status === 'Done' }
      return { queryKey: taskKeys.list(f), queryFn: () => tasksApi.list(f), placeholderData: keepPreviousData }
    }),
  })

  const move = useMutation({
    mutationFn: ({ task, to }: { task: Task; to: TaskStatus }) => tasksApi.changeStatus(task.companyId, task.id, to),
    onSuccess: (t) => {
      toast.success(`#${t.number} agora está em "${taskStatusMeta[t.status].label}".`)
      queryClient.invalidateQueries({ queryKey: taskKeys.all })
    },
    onError: (e) => toast.error(getErrorMessage(e, 'Não foi possível mover a tarefa.')),
  })

  const canDrop = (to: TaskStatus) => !!dragging && dragging.status !== to && TASK_TRANSITIONS[dragging.status].includes(to)

  const drop = (to: TaskStatus) => {
    const task = dragging
    setDragging(null)
    setOver(null)
    if (!task || !canDrop(to)) return
    if (to === 'Done') setCompleting(task)
    else move.mutate({ task, to })
  }

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-3">
        {COLUMNS.map((status, i) => {
          const q = columns[i]
          const items = q.data?.items ?? []
          const total = q.data?.total ?? 0
          const droppable = canDrop(status)
          return (
            <section
              key={status}
              aria-label={taskStatusMeta[status].label}
              onDragOver={(e) => {
                if (!droppable) return
                e.preventDefault()
                setOver(status)
              }}
              onDragLeave={() => setOver((o) => (o === status ? null : o))}
              onDrop={(e) => {
                e.preventDefault()
                drop(status)
              }}
              className={cn(
                'flex min-h-64 flex-col rounded-xl border bg-slate-50/70 transition-colors',
                over === status
                  ? 'border-brand-400 bg-brand-50/60'
                  : droppable
                    ? 'border-dashed border-brand-300'
                    : 'border-slate-200',
              )}
            >
              <header className="flex items-center justify-between gap-2 px-3 py-2.5">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
                  <span className={cn('h-2 w-2 rounded-full', ACCENT[status])} />
                  {taskStatusMeta[status].label}
                </h2>
                <span className="rounded-full bg-white px-2 text-xs font-medium text-slate-600 shadow-sm">{total}</span>
              </header>
              <div className="flex-1 space-y-2 overflow-y-auto px-2 pb-2 lg:max-h-[calc(100vh-320px)]">
                {q.isLoading
                  ? Array.from({ length: 3 }, (_, k) => <Skeleton key={k} className="h-24" />)
                  : items.map((t) => (
                      <TaskCard
                        key={t.id}
                        task={t}
                        dragging={dragging?.id === t.id}
                        onDragStart={() => setDragging(t)}
                        onDragEnd={() => {
                          setDragging(null)
                          setOver(null)
                        }}
                      />
                    ))}
                {!q.isLoading && items.length === 0 && (
                  <p className="px-2 py-6 text-center text-xs text-slate-400">Nenhuma tarefa.</p>
                )}
                {total > items.length && (
                  <p className="px-2 py-1 text-center text-xs text-slate-500">
                    Mostrando {items.length} de {total}. Use os filtros ou a lista para ver o resto.
                  </p>
                )}
              </div>
            </section>
          )
        })}
      </div>
      {completing && (
        <CompleteTaskModal
          task={completing}
          open
          onClose={() => setCompleting(null)}
          onDone={() => {
            queryClient.invalidateQueries({ queryKey: taskKeys.all })
            setCompleting(null)
          }}
        />
      )}
    </>
  )
}

function TaskCard({
  task: t,
  dragging,
  onDragStart,
  onDragEnd,
}: {
  task: Task
  dragging: boolean
  onDragStart: () => void
  onDragEnd: () => void
}) {
  return (
    <Link
      to={taskHref(t)}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('text/plain', t.id)
        onDragStart()
      }}
      onDragEnd={onDragEnd}
      className={cn(
        'block cursor-grab rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition hover:border-brand-300 hover:shadow active:cursor-grabbing',
        dragging && 'opacity-40',
      )}
    >
      <p className="flex items-start justify-between gap-2">
        <span className="line-clamp-2 text-sm font-medium text-ink">{t.title}</span>
        <span className="shrink-0 font-mono text-xs text-slate-400">#{t.number}</span>
      </p>
      <p className="mt-1 truncate text-xs text-slate-500">
        {t.companyName} · {departmentLabels[t.department]}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
        <span className={cn('inline-flex items-center gap-1', t.isOverdue && 'font-semibold text-red-600')}>
          {t.isOverdue ? <AlertTriangle className="h-3.5 w-3.5" /> : <CalendarClock className="h-3.5 w-3.5" />}
          {formatDate(t.internalDueDate)}
        </span>
        {t.legalDueDate && (
          <span className={cn(t.isLegalOverdue && 'font-semibold text-red-600')}>legal {formatDate(t.legalDueDate)}</span>
        )}
        {t.comments > 0 && (
          <span className="inline-flex items-center gap-1">
            <MessageSquare className="h-3.5 w-3.5" /> {t.comments}
          </span>
        )}
        {t.attachments > 0 && (
          <span className="inline-flex items-center gap-1">
            <Paperclip className="h-3.5 w-3.5" /> {t.attachments}
          </span>
        )}
        <span className="ml-auto truncate text-slate-600">{t.assigneeName.split(' ')[0]}</span>
      </div>
    </Link>
  )
}
