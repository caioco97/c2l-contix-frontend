import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CircleDot,
  Download,
  MessageSquare,
  Send,
  UserRoundCheck,
} from 'lucide-react'
import { Badge, Button, Card, CardBody, EmptyState, FormField, Input, Modal, Select, Skeleton, Textarea, useToast } from '@/components/ui'
import { useAuth } from '@/features/auth/AuthContext'
import { saveBlob } from '@/features/documents/api'
import { getErrorMessage } from '@/lib/api'
import { cn } from '@/lib/cn'
import { formatBytes, formatDate, formatDateTime } from '@/lib/format'
import { formatCep, formatCpf, formatPhone, formatPis } from '@/lib/br'
import type { RequestEvent, ServiceRequestDetail, ServiceRequestStatus } from '@/types/domain'
import { requestKeys, requestsApi } from '../api'
import { dataLabels, departmentLabels, enumLabels, statusActions, statusMeta } from '../meta'
import { AttachmentPicker } from './AttachmentPicker'
import { RequestTasksPanel } from '@/features/tasks/components/RequestTasksPanel'

interface Props {
  companyId: string
  requestId: string
}

/** Detalhe de uma solicitação: dados, histórico, comentários e ações (cliente e escritório). */
export function RequestDetail({ companyId, requestId }: Props) {
  const { user } = useAuth()
  const isOffice = user?.role !== 'Client'
  const query = useQuery({
    queryKey: requestKeys.detail(companyId, requestId),
    queryFn: () => requestsApi.get(companyId, requestId),
  })

  if (query.isLoading) return <Skeleton className="h-96 rounded-xl" />
  if (!query.data) return <EmptyState title="Solicitação não encontrada" description={getErrorMessage(query.error, '')} />

  const r = query.data
  const status = statusMeta[r.status]
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-xs text-slate-500">
            #{r.number} · {r.typeName}
          </p>
          <h1 className="text-xl font-semibold text-ink">{r.subject}</h1>
        </div>
        <Badge tone={status.tone} className="text-sm">
          {isOffice ? status.officeLabel : status.label}
        </Badge>
      </div>

      {!isOffice && r.status === 'WaitingClient' && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          O escritório precisa de uma resposta sua para continuar. Responda abaixo; a solicitação volta para análise.
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0 space-y-5">
          <RequestData request={r} />
          <Timeline request={r} companyId={companyId} isOffice={isOffice} />
          {(isOffice || !['Done', 'Canceled'].includes(r.status)) && (
            <CommentBox companyId={companyId} requestId={r.id} />
          )}
        </div>
        <aside className="space-y-5 lg:self-start">
          <Summary request={r} isOffice={isOffice} />
          <StatusActions request={r} companyId={companyId} isOffice={isOffice} />
          {isOffice && <AssignPanel request={r} companyId={companyId} />}
          {isOffice && <RequestTasksPanel request={r} companyId={companyId} />}
        </aside>
      </div>
    </div>
  )
}

function useUpdateDetail(companyId: string, requestId: string) {
  const queryClient = useQueryClient()
  return (detail: ServiceRequestDetail) => {
    queryClient.setQueryData(requestKeys.detail(companyId, requestId), detail)
    queryClient.invalidateQueries({ queryKey: requestKeys.all, refetchType: 'none' })
  }
}

function Summary({ request: r, isOffice }: { request: ServiceRequestDetail; isOffice: boolean }) {
  const due = r.dueDate ? (
    <span className={cn(r.isOverdue && 'font-semibold text-red-600')}>
      {formatDate(r.dueDate)}
      {r.isOverdue && ' · atrasada'}
    </span>
  ) : (
    '—'
  )
  const rows: { label: string; value: React.ReactNode }[] = [
    { label: 'Empresa', value: r.companyName },
    { label: 'Departamento', value: departmentLabels[r.department] },
    { label: 'Solicitante', value: r.requesterName },
    { label: 'Aberta em', value: formatDateTime(r.createdAt) },
    { label: 'Prazo', value: due },
    { label: 'Responsável', value: r.assigneeName ?? (isOffice ? 'Sem responsável' : 'Aguardando atribuição') },
  ]
  if (r.employeeId && r.employeeName)
    rows.splice(1, 0, {
      label: 'Empregado',
      value: (
        <Link
          to={isOffice ? `/empresas/${r.companyId}?aba=empregados` : '/portal/empregados'}
          className="font-medium text-brand-700 hover:underline"
        >
          {r.employeeName}
        </Link>
      ),
    })
  if (r.closedAt) rows.push({ label: 'Finalizada em', value: formatDateTime(r.closedAt) })
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

function formatValue(key: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não'
  if (typeof value === 'number')
    return key === 'salario' || key === 'valor'
      ? value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      : value.toLocaleString('pt-BR')
  if (typeof value === 'string') {
    if (key === 'competencia') return formatDate(value, 'MM/yyyy')
    if (key === 'cpf') return formatCpf(value)
    if (key === 'pis') return formatPis(value)
    if (key === 'telefone') return formatPhone(value)
    if (key === 'cep') return formatCep(value)
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return formatDate(value)
    return enumLabels[value] ?? value
  }
  if (typeof value === 'object')
    return Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => Boolean(v))
      .map(([k, v]) => (k === 'cep' ? `CEP ${formatCep(String(v))}` : String(v)))
      .join(', ')
  return String(value)
}

function RequestData({ request: r }: { request: ServiceRequestDetail }) {
  // O jsonb do PostgreSQL não preserva a ordem das chaves: ordena pela ordem dos rótulos.
  const order = Object.keys(dataLabels)
  const entries = Object.entries(r.data ?? {})
    // O id do empregado não é exibido: o nome (gravado a partir do cadastro) já aparece.
    .filter(([k]) => k !== 'lancamentos' && k !== 'empregadoId')
    .sort(([a], [b]) => (order.indexOf(a) + 1 || 999) - (order.indexOf(b) + 1 || 999))
  const lancamentos = (r.data?.lancamentos ?? []) as Record<string, unknown>[]
  if (!entries.length && !lancamentos.length) return null
  return (
    <Card>
      <CardBody className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Dados informados</h2>
        {entries.length > 0 && (
          <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            {entries.map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs text-slate-500">{dataLabels[k] ?? k}</dt>
                <dd className="text-ink">{formatValue(k, v)}</dd>
              </div>
            ))}
          </dl>
        )}
        {lancamentos.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-slate-500">
                <tr>
                  <th className="py-1.5 pr-3 font-medium">Empregado</th>
                  <th className="py-1.5 pr-3 font-medium">Rubrica</th>
                  <th className="py-1.5 pr-3 text-right font-medium">Qtd.</th>
                  <th className="py-1.5 text-right font-medium">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lancamentos.map((l, i) => (
                  <tr key={i}>
                    <td className="py-1.5 pr-3">{String(l.empregado)}</td>
                    <td className="py-1.5 pr-3">{String(l.rubrica)}</td>
                    <td className="py-1.5 pr-3 text-right">{formatValue('quantidade', l.quantidade)}</td>
                    <td className="py-1.5 text-right">{formatValue('valor', l.valor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardBody>
    </Card>
  )
}

function eventTitle(e: RequestEvent, isOffice: boolean) {
  const label = (s: ServiceRequestStatus | null) => (s ? (isOffice ? statusMeta[s].officeLabel : statusMeta[s].label) : '')
  switch (e.kind) {
    case 'opened':
      return 'abriu a solicitação'
    case 'comment':
      return 'comentou'
    case 'assignment':
      return 'atualizou a atribuição'
    case 'status':
      return (
        <>
          mudou o status: {label(e.fromStatus)} <ArrowRight className="inline h-3 w-3" /> {label(e.toStatus)}
        </>
      )
  }
}

function Timeline({ request: r, companyId, isOffice }: { request: ServiceRequestDetail; companyId: string; isOffice: boolean }) {
  const toast = useToast()
  const download = async (id: string, fileName: string) => {
    try {
      saveBlob(await requestsApi.downloadAttachment(companyId, r.id, id), fileName)
    } catch (e) {
      toast.error(getErrorMessage(e, 'Não foi possível baixar o anexo.'))
    }
  }
  return (
    <Card>
      <CardBody>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">Histórico</h2>
        <ol className="space-y-5">
          {r.history.map((e) => {
            const Icon = e.kind === 'comment' ? MessageSquare : e.kind === 'assignment' ? UserRoundCheck : CircleDot
            return (
              <li key={e.id} className="flex gap-3">
                <span
                  className={cn(
                    'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                    e.authorIsOffice ? 'bg-brand-50 text-brand-700' : 'bg-slate-100 text-slate-600',
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-600">
                    <span className="font-semibold text-ink">{e.authorName}</span>
                    {e.authorIsOffice && <span className="ml-1 text-xs text-brand-700">(escritório)</span>} {eventTitle(e, isOffice)}
                    <span className="ml-2 whitespace-nowrap text-xs text-slate-400">{formatDateTime(e.createdAt)}</span>
                  </p>
                  {e.message && (
                    <p
                      className={cn(
                        'mt-1.5 whitespace-pre-wrap rounded-lg px-3 py-2 text-sm text-ink',
                        e.kind === 'comment' || e.kind === 'opened' ? 'bg-slate-50' : 'bg-transparent px-0 py-0 text-slate-600',
                      )}
                    >
                      {e.message}
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

function CommentBox({ companyId, requestId }: { companyId: string; requestId: string }) {
  const toast = useToast()
  const update = useUpdateDetail(companyId, requestId)
  const [message, setMessage] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const send = useMutation({
    mutationFn: () => requestsApi.comment(companyId, requestId, { message: message.trim(), attachments: files }),
    onSuccess: (detail) => {
      update(detail)
      setMessage('')
      setFiles([])
      toast.success('Mensagem enviada.')
    },
    onError: (e) => toast.error(getErrorMessage(e, 'Não foi possível enviar a mensagem.')),
  })
  const empty = !message.trim() && files.length === 0
  return (
    <Card>
      <CardBody className="space-y-3">
        <FormField label="Nova mensagem" htmlFor="comment">
          <Textarea id="comment" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} />
        </FormField>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <AttachmentPicker files={files} onChange={setFiles} label="" />
          <Button onClick={() => send.mutate()} loading={send.isPending} disabled={empty}>
            <Send className="h-4 w-4" />
            Enviar
          </Button>
        </div>
      </CardBody>
    </Card>
  )
}

function StatusActions({ request: r, companyId, isOffice }: { request: ServiceRequestDetail; companyId: string; isOffice: boolean }) {
  const toast = useToast()
  const update = useUpdateDetail(companyId, r.id)
  const [target, setTarget] = useState<ServiceRequestStatus | null>(null)
  const [message, setMessage] = useState('')
  const change = useMutation({
    mutationFn: (status: ServiceRequestStatus) => requestsApi.changeStatus(companyId, r.id, status, message.trim()),
    onSuccess: (detail) => {
      update(detail)
      setTarget(null)
      setMessage('')
      toast.success('Status atualizado.')
    },
    onError: (e) => toast.error(getErrorMessage(e, 'Não foi possível mudar o status.')),
  })

  if (r.allowedTransitions.length === 0) return null
  const label = (s: ServiceRequestStatus) =>
    !isOffice && s === 'Canceled'
      ? 'Cancelar solicitação'
      : s === 'InAnalysis' && ['Done', 'Canceled'].includes(r.status)
        ? 'Reabrir'
        : statusActions[s].label
  const action = target ? statusActions[target] : null

  return (
    <Card>
      <CardBody className="space-y-2">
        <h2 className="text-xs font-medium uppercase tracking-wide text-slate-500">Ações</h2>
        {r.allowedTransitions.map((s) => (
          <Button
            key={s}
            className="w-full justify-center"
            variant={statusActions[s].danger ? 'secondary' : s === 'Done' ? 'primary' : 'secondary'}
            onClick={() => setTarget(s)}
          >
            {label(s)}
          </Button>
        ))}
      </CardBody>
      <Modal
        open={!!target}
        onClose={() => setTarget(null)}
        title={target ? label(target) : ''}
        description={
          action?.needsMessage
            ? 'Explique ao cliente o que é necessário. Ele será avisado e poderá responder por aqui.'
            : 'Se quiser, deixe uma mensagem que ficará registrada no histórico.'
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setTarget(null)}>
              Voltar
            </Button>
            <Button
              variant={action?.danger ? 'danger' : 'primary'}
              loading={change.isPending}
              disabled={!!action?.needsMessage && !message.trim()}
              onClick={() => target && change.mutate(target)}
            >
              Confirmar
            </Button>
          </>
        }
      >
        <FormField label={action?.needsMessage ? 'Mensagem ao cliente' : 'Mensagem (opcional)'} htmlFor="status-message" required={action?.needsMessage}>
          <Textarea id="status-message" rows={4} value={message} onChange={(e) => setMessage(e.target.value)} />
        </FormField>
      </Modal>
    </Card>
  )
}

function AssignPanel({ request: r, companyId }: { request: ServiceRequestDetail; companyId: string }) {
  const toast = useToast()
  const update = useUpdateDetail(companyId, r.id)
  const { user } = useAuth()
  const users = useQuery({ queryKey: requestKeys.officeUsers, queryFn: requestsApi.officeUsers, staleTime: 5 * 60_000 })
  const [assigneeId, setAssigneeId] = useState(r.assigneeId ?? '')
  const [dueDate, setDueDate] = useState(r.dueDate ?? '')
  const save = useMutation({
    mutationFn: (input: { assigneeId: string | null; dueDate: string | null }) => requestsApi.assign(companyId, r.id, input),
    onSuccess: (detail) => {
      update(detail)
      toast.success('Atribuição salva.')
    },
    onError: (e) => toast.error(getErrorMessage(e, 'Não foi possível salvar a atribuição.')),
  })
  const changed = assigneeId !== (r.assigneeId ?? '') || dueDate !== (r.dueDate ?? '')

  return (
    <Card>
      <CardBody className="space-y-3">
        <h2 className="text-xs font-medium uppercase tracking-wide text-slate-500">Atendimento</h2>
        <FormField label="Responsável" htmlFor="assignee">
          <Select
            id="assignee"
            value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value)}
            placeholder="Sem responsável"
            options={(users.data ?? []).map((u) => ({ value: u.id, label: u.name }))}
          />
        </FormField>
        {user && assigneeId !== user.id && (
          <button type="button" className="text-xs font-medium text-brand-700 hover:underline" onClick={() => setAssigneeId(user.id)}>
            Atribuir a mim
          </button>
        )}
        <FormField label="Prazo" htmlFor="due-date">
          <Input id="due-date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </FormField>
        <Button
          className="w-full justify-center"
          variant="secondary"
          disabled={!changed}
          loading={save.isPending}
          onClick={() => save.mutate({ assigneeId: assigneeId || null, dueDate: dueDate || null })}
        >
          <CalendarClock className="h-4 w-4" />
          Salvar atribuição
        </Button>
      </CardBody>
    </Card>
  )
}
