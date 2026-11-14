import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowRight, CircleDot, Download, FileCheck2, MessageSquare, Pencil, Send, SquarePen } from 'lucide-react'
import { Badge, Button, Card, CardBody, EmptyState, FormField, Modal, Skeleton, Textarea, useToast } from '@/components/ui'
import { saveBlob } from '@/features/documents/api'
import { AttachmentPicker } from '@/features/requests/components/AttachmentPicker'
import { departmentLabels } from '@/features/requests/meta'
import { getErrorMessage } from '@/lib/api'
import { cn } from '@/lib/cn'
import { formatBytes, formatDate, formatDateTime } from '@/lib/format'
import type { TaskDetail, TaskEvent, TaskInput, TaskStatus } from '@/types/domain'
import { taskKeys, tasksApi } from '../api'
import { taskStatusMeta } from '../meta'
import { TaskFormModal } from './TaskFormModal'
import { CompleteTaskModal } from './CompleteTaskModal'

interface Props {
  companyId: string
  taskId: string
}

/** Detalhe da tarefa: dados, prazos, histórico, comentários com anexos e ações de status. */
export function TaskDetailView({ companyId, taskId }: Props) {
  const [editing, setEditing] = useState(false)
  const toast = useToast()
  const update = useUpdateDetail(companyId, taskId)
  const query = useQuery({ queryKey: taskKeys.detail(companyId, taskId), queryFn: () => tasksApi.get(companyId, taskId) })
  const save = useMutation({
    mutationFn: (input: TaskInput) => tasksApi.update(companyId, taskId, input),
    onSuccess: (detail) => {
      update(detail)
      setEditing(false)
      toast.success('Tarefa atualizada.')
    },
    onError: (e) => toast.error(getErrorMessage(e, 'Não foi possível salvar a tarefa.')),
  })

  if (query.isLoading) return <Skeleton className="h-96 rounded-xl" />
  if (!query.data) return <EmptyState title="Tarefa não encontrada" description={getErrorMessage(query.error, '')} />

  const t = query.data
  const status = taskStatusMeta[t.status]
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-xs text-slate-500">
            #{t.number} · {t.companyName}
          </p>
          <h1 className="text-xl font-semibold text-ink">{t.title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={status.tone} className="text-sm">
            {status.label}
          </Badge>
          <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="h-4 w-4" /> Editar
          </Button>
        </div>
      </div>

      {(t.isOverdue || t.isLegalOverdue) && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {t.isLegalOverdue
            ? `O prazo legal venceu em ${formatDate(t.legalDueDate)}.`
            : `O prazo interno venceu em ${formatDate(t.internalDueDate)}.`}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0 space-y-5">
          {t.description && (
            <Card>
              <CardBody>
                <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Descrição</h2>
                <p className="whitespace-pre-wrap text-sm text-ink">{t.description}</p>
              </CardBody>
            </Card>
          )}
          <Delivered task={t} />
          <Timeline task={t} companyId={companyId} />
          <CommentBox companyId={companyId} taskId={t.id} />
        </div>
        <aside className="space-y-5 lg:self-start">
          <Summary task={t} />
          <StatusActions task={t} companyId={companyId} />
        </aside>
      </div>

      <TaskFormModal
        open={editing}
        task={t}
        onClose={() => setEditing(false)}
        onSubmit={(_, input) => save.mutateAsync(input).then(() => undefined, () => undefined)}
      />
    </div>
  )
}

function useUpdateDetail(companyId: string, taskId: string) {
  const queryClient = useQueryClient()
  return (detail: TaskDetail) => {
    queryClient.setQueryData(taskKeys.detail(companyId, taskId), detail)
    queryClient.invalidateQueries({ queryKey: taskKeys.all, refetchType: 'none' })
    queryClient.invalidateQueries({ queryKey: ['companies', 'panel', companyId] })
  }
}

function Summary({ task: t }: { task: TaskDetail }) {
  const date = (iso: string | null, late: boolean, lateLabel: string) =>
    iso ? (
      <span className={cn(late && 'font-semibold text-red-600')}>
        {formatDate(iso)}
        {late && ` · ${lateLabel}`}
      </span>
    ) : (
      '—'
    )
  const rows: { label: string; value: React.ReactNode }[] = [
    { label: 'Empresa', value: t.companyName },
    { label: 'Departamento', value: departmentLabels[t.department] },
    ...(t.request
      ? [
          {
            label: 'Solicitação do cliente',
            value: (
              <Link to={`/atendimento/${t.companyId}/${t.request.id}`} className="text-brand-700 hover:underline">
                #{t.request.number} · {t.request.subject}
              </Link>
            ),
          },
        ]
      : []),
    ...(t.obligationTitle
      ? [{ label: 'Obrigação recorrente', value: `${t.obligationTitle}${t.period ? ` · ${formatDate(t.period, 'MM/yyyy')}` : ''}` }]
      : []),
    { label: 'Responsável', value: t.assigneeName },
    { label: 'Prazo interno', value: date(t.internalDueDate, t.isOverdue, 'atrasada') },
    { label: 'Prazo legal', value: date(t.legalDueDate, t.isLegalOverdue, 'vencido') },
    { label: 'Criada por', value: `${t.createdByName} em ${formatDateTime(t.createdAt)}` },
  ]
  if (t.completedAt) rows.push({ label: 'Concluída em', value: formatDateTime(t.completedAt) })
  return (
    <Card>
      <CardBody>
        <dl className="space-y-3 text-sm">
          {rows.map(({ label, value }) => (
            <div key={label}>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
              <dd className="text-ink">{value}</dd>
            </div>
          ))}
        </dl>
      </CardBody>
    </Card>
  )
}

function eventTitle(e: TaskEvent) {
  const label = (s: TaskStatus | null) => (s ? taskStatusMeta[s].label : '')
  switch (e.kind) {
    case 'created':
      return 'criou a tarefa'
    case 'comment':
      return 'comentou'
    case 'edit':
      return 'editou a tarefa'
    case 'status':
      return (
        <>
          mudou o status: {label(e.fromStatus)} <ArrowRight className="inline h-3 w-3" /> {label(e.toStatus)}
        </>
      )
  }
}

const EVENT_ICONS = { created: CircleDot, comment: MessageSquare, edit: SquarePen, status: CircleDot } as const

function Timeline({ task: t, companyId }: { task: TaskDetail; companyId: string }) {
  const toast = useToast()
  const download = async (id: string, fileName: string) => {
    try {
      saveBlob(await tasksApi.downloadAttachment(companyId, t.id, id), fileName)
    } catch (e) {
      toast.error(getErrorMessage(e, 'Não foi possível baixar o anexo.'))
    }
  }
  return (
    <Card>
      <CardBody>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">Histórico</h2>
        <ol className="space-y-5">
          {t.history.map((e) => {
            const Icon = EVENT_ICONS[e.kind]
            // A descrição já aparece no card próprio.
            const message = e.kind === 'created' ? null : e.message
            return (
              <li key={e.id} className="flex gap-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-600">
                    <span className="font-semibold text-ink">{e.authorName}</span> {eventTitle(e)}
                    <span className="ml-2 whitespace-nowrap text-xs text-slate-400">{formatDateTime(e.createdAt)}</span>
                  </p>
                  {message && (
                    <p
                      className={cn(
                        'mt-1.5 whitespace-pre-wrap text-sm',
                        e.kind === 'comment' ? 'rounded-lg bg-slate-50 px-3 py-2 text-ink' : 'text-slate-600',
                      )}
                    >
                      {message}
                    </p>
                  )}
                  {e.attachments.length > 0 && (
                    <ul className="mt-2 flex flex-wrap gap-2">
                      {e.attachments.map((a) => (
                        <li key={a.id}>
                          <button
                            type="button"
                            onClick={() => download(a.id, a.fileName)}
                            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-700 hover:border-brand-300 hover:text-brand-700"
                          >
                            <Download className="h-3.5 w-3.5" />
                            {a.fileName} <span className="text-slate-400">{formatBytes(a.sizeBytes)}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </li>
            )
          })}
        </ol>
      </CardBody>
    </Card>
  )
}

function CommentBox({ companyId, taskId }: { companyId: string; taskId: string }) {
  const toast = useToast()
  const update = useUpdateDetail(companyId, taskId)
  const [message, setMessage] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const send = useMutation({
    mutationFn: () => tasksApi.comment(companyId, taskId, { message: message.trim(), attachments: files }),
    onSuccess: (detail) => {
      update(detail)
      setMessage('')
      setFiles([])
      toast.success('Comentário adicionado.')
    },
    onError: (e) => toast.error(getErrorMessage(e, 'Não foi possível adicionar o comentário.')),
  })
  const empty = !message.trim() && files.length === 0
  return (
    <Card>
      <CardBody className="space-y-3">
        <FormField label="Novo comentário" htmlFor="task-comment">
          <Textarea id="task-comment" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} />
        </FormField>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <AttachmentPicker files={files} onChange={setFiles} label="" />
          <Button onClick={() => send.mutate()} loading={send.isPending} disabled={empty}>
            <Send className="h-4 w-4" />
            Comentar
          </Button>
        </div>
      </CardBody>
    </Card>
  )
}

function StatusActions({ task: t, companyId }: { task: TaskDetail; companyId: string }) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const update = useUpdateDetail(companyId, t.id)
  const [target, setTarget] = useState<TaskStatus | null>(null)
  const [completing, setCompleting] = useState(false)
  const [message, setMessage] = useState('')
  const change = useMutation({
    mutationFn: (status: TaskStatus) => tasksApi.changeStatus(companyId, t.id, status, message.trim()),
    onSuccess: (detail) => {
      update(detail)
      setTarget(null)
      setMessage('')
      toast.success('Status atualizado.')
    },
    onError: (e) => toast.error(getErrorMessage(e, 'Não foi possível mudar o status.')),
  })

  if (t.allowedTransitions.length === 0) return null
  const closed = t.status === 'Done' || t.status === 'Canceled'
  const label = (s: TaskStatus) => (closed ? 'Reabrir' : taskStatusMeta[s].action)

  return (
    <Card>
      <CardBody className="space-y-2">
        <h2 className="text-xs font-medium uppercase tracking-wide text-slate-500">Ações</h2>
        {t.allowedTransitions.map((s) => (
          <Button
            key={s}
            className="w-full justify-center"
            variant={s === 'Done' ? 'primary' : 'secondary'}
            onClick={() => (s === 'Done' && !closed ? setCompleting(true) : setTarget(s))}
          >
            {label(s)}
          </Button>
        ))}
      </CardBody>
      <Modal
        open={!!target}
        onClose={() => setTarget(null)}
        title={target ? label(target) : ''}
        description="Se quiser, deixe uma observação que ficará registrada no histórico."
        footer={
          <>
            <Button variant="secondary" onClick={() => setTarget(null)}>
              Voltar
            </Button>
            <Button
              variant={target === 'Canceled' ? 'danger' : 'primary'}
              loading={change.isPending}
              onClick={() => target && change.mutate(target)}
            >
              Confirmar
            </Button>
          </>
        }
      >
        <FormField label="Observação (opcional)" htmlFor="task-status-message">
          <Textarea id="task-status-message" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} />
        </FormField>
      </Modal>
      {completing && (
      <CompleteTaskModal
        task={t}
        open
        onClose={() => setCompleting(false)}
        onDone={(detail) => {
          update(detail)
          queryClient.invalidateQueries({ queryKey: ['documents', companyId] })
          setCompleting(false)
        }}
      />
      )}
    </Card>
  )
}

/** Arquivos entregues ao cliente na conclusão da tarefa. */
function Delivered({ task: t }: { task: TaskDetail }) {
  if (t.deliveredDocuments.length === 0) return null
  return (
    <Card>
      <CardBody>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
          <FileCheck2 className="h-4 w-4 text-emerald-600" /> Entregue ao cliente
        </h2>
        <ul className="divide-y divide-slate-100 text-sm">
          {t.deliveredDocuments.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-3 py-2">
              <Link to={`/empresas/${t.companyId}?aba=documentos`} className="truncate text-ink hover:text-brand-700">
                {d.name}
              </Link>
              {d.dueDate && <span className="whitespace-nowrap text-xs text-slate-500">vence {formatDate(d.dueDate)}</span>}
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  )
}
