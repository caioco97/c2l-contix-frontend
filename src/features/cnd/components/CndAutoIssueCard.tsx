import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, Clock, RefreshCw, Zap } from 'lucide-react'
import {
  Badge,
  Button,
  Card,
  CardHeader,
  Checkbox,
  FormField,
  Input,
  Select,
  Skeleton,
  useToast,
  type BadgeTone,
} from '@/components/ui'
import { getErrorMessage } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import { requestKeys, requestsApi } from '@/features/requests/api'
import type { CndAutoConfigInput, CndIssueStatus, CndType } from '@/types/domain'
import { CND_TYPES, cndApi, cndKeys } from '../api'

const STATUS: Record<CndIssueStatus, { label: string; tone: BadgeTone; icon: typeof Clock }> = {
  Pendente: { label: 'Na fila', tone: 'info', icon: Clock },
  Emitida: { label: 'Emitida', tone: 'success', icon: CheckCircle2 },
  Falha: { label: 'Falhou', tone: 'danger', icon: AlertTriangle },
}

const labelOf = (type: CndType) => CND_TYPES.find((t) => t.value === type)?.label ?? type

/** Emissão automática de CND da empresa: agendamento, "Emitir agora" e últimas emissões (escritório). */
export function CndAutoIssueCard({ companyId }: { companyId: string }) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const config = useQuery({ queryKey: cndKeys.autoConfig(companyId), queryFn: () => cndApi.autoConfig(companyId) })
  const issues = useQuery({
    queryKey: cndKeys.issues(companyId),
    queryFn: () => cndApi.issues(companyId),
    // Enquanto houver emissão na fila, acompanha o andamento.
    refetchInterval: (q) => (q.state.data?.some((i) => i.status === 'Pendente') ? 5_000 : false),
  })
  const users = useQuery({ queryKey: requestKeys.officeUsers, queryFn: requestsApi.officeUsers, staleTime: 5 * 60_000 })

  // Edição em rascunho; sem rascunho, o formulário mostra o que está salvo.
  const [draft, setDraft] = useState<CndAutoConfigInput | null>(null)

  // Quando uma emissão sai da fila, a lista de certidões muda.
  const pending = issues.data?.filter((i) => i.status === 'Pendente').length ?? 0
  const lastPending = useRef(0)
  useEffect(() => {
    if (pending < lastPending.current) queryClient.invalidateQueries({ queryKey: cndKeys.list(companyId) })
    lastPending.current = pending
  }, [pending, companyId, queryClient])

  const save = useMutation({
    mutationFn: (input: CndAutoConfigInput) => cndApi.saveAutoConfig(companyId, input),
    onSuccess: (data) => {
      queryClient.setQueryData(cndKeys.autoConfig(companyId), data)
      setDraft(null)
      toast.success(data.active ? 'Emissão automática ativada.' : 'Emissão automática desativada.')
    },
    onError: (e) => toast.error(getErrorMessage(e, 'Não foi possível salvar a configuração.')),
  })

  const issueNow = useMutation({
    mutationFn: (types: CndType[]) => cndApi.issueNow(companyId, types),
    onSuccess: () => {
      toast.success('Emissão iniciada. As certidões aparecem aqui assim que o órgão responder.')
      queryClient.invalidateQueries({ queryKey: cndKeys.issues(companyId) })
      queryClient.invalidateQueries({ queryKey: cndKeys.list(companyId) })
    },
    onError: (e) => toast.error(getErrorMessage(e, 'Não foi possível pedir a emissão.')),
  })

  if (config.isLoading) {
    return (
      <Card className="p-5">
        <Skeleton className="h-24 w-full" />
      </Card>
    )
  }
  if (config.isError || !config.data) return null
  const c = config.data
  const form: CndAutoConfigInput = draft ?? { active: c.active, types: c.types, daysBefore: c.daysBefore, assigneeId: c.assigneeId }
  const setForm = setDraft

  const dirty =
    form.active !== c.active ||
    form.daysBefore !== c.daysBefore ||
    (form.assigneeId ?? null) !== (c.assigneeId ?? null) ||
    [...form.types].sort().join() !== [...c.types].sort().join()
  const invalidDays = !Number.isInteger(form.daysBefore) || form.daysBefore < 0 || form.daysBefore > 60

  const toggleType = (type: CndType, on: boolean) =>
    setForm({ ...form, types: on ? [...form.types, type] : form.types.filter((t) => t !== type) })

  return (
    <Card className="overflow-hidden">
      <CardHeader
        className="pb-1"
        icon={<Zap className="h-5 w-5" />}
        title="Emissão automática"
        action={
          c.integrationEnabled ? (
            <Badge tone={c.active ? 'success' : 'neutral'}>{c.active ? 'Ativa' : 'Desativada'}</Badge>
          ) : (
            <Badge tone="warning">Não configurada</Badge>
          )
        }
      />
      <div className="space-y-4 px-5 pb-5">
        {!c.integrationEnabled ? (
          <p className="text-sm text-slate-600">
            A emissão automática depende de um serviço integrador (os portais oficiais exigem captcha) e ainda não foi
            configurada neste ambiente. Fale com o administrador do sistema.
          </p>
        ) : (
          <>
            <p className="text-sm text-slate-600">
              O Contix emite as certidões nos órgãos e renova antes do vencimento. O PDF entra no histórico da empresa e
              falhas avisam o responsável.
            </p>

            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-ink">
              <Checkbox checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
              Emitir e renovar automaticamente
            </label>

            <fieldset>
              <legend className="mb-2 text-sm font-medium text-slate-700">Certidões</legend>
              <div className="flex flex-wrap gap-x-5 gap-y-2">
                {c.supportedTypes.map((type) => (
                  <label key={type} className="flex cursor-pointer items-center gap-2 text-sm text-ink">
                    <Checkbox checked={form.types.includes(type)} onChange={(e) => toggleType(type, e.target.checked)} />
                    {labelOf(type)}
                  </label>
                ))}
              </div>
              <p className="mt-1.5 text-xs text-slate-500">Estadual e municipal ainda são cadastradas manualmente.</p>
            </fieldset>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label="Renovar quando faltarem"
                htmlFor="cnd-auto-days"
                hint="Dias antes do vencimento (0 a 60)."
                error={invalidDays ? 'Informe de 0 a 60 dias.' : undefined}
              >
                <Input
                  id="cnd-auto-days"
                  type="number"
                  min={0}
                  max={60}
                  invalid={invalidDays}
                  value={Number.isNaN(form.daysBefore) ? '' : form.daysBefore}
                  onChange={(e) => setForm({ ...form, daysBefore: e.target.valueAsNumber })}
                />
              </FormField>
              <FormField label="Avisar falhas para" htmlFor="cnd-auto-assignee" hint="Sem responsável, toda a equipe é avisada.">
                <Select
                  id="cnd-auto-assignee"
                  placeholder="Toda a equipe"
                  options={(users.data ?? []).map((u) => ({ value: u.id, label: u.name }))}
                  value={form.assigneeId ?? ''}
                  onChange={(e) => setForm({ ...form, assigneeId: e.target.value || null })}
                />
              </FormField>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <Button
                variant="secondary"
                loading={issueNow.isPending}
                disabled={form.types.length === 0}
                onClick={() => issueNow.mutate(form.types)}
              >
                <RefreshCw className="h-4 w-4" />
                Emitir agora
              </Button>
              <Button
                loading={save.isPending}
                disabled={!dirty || invalidDays || (form.active && form.types.length === 0)}
                onClick={() => save.mutate(form)}
              >
                Salvar
              </Button>
            </div>
          </>
        )}

        {!!issues.data?.length && (
          <div className="border-t border-slate-100 pt-4">
            <h3 className="mb-2 text-sm font-medium text-slate-700">Últimas emissões</h3>
            <ul className="divide-y divide-slate-100">
              {issues.data.slice(0, 8).map((i) => {
                const s = STATUS[i.status]
                const Icon = s.icon
                return (
                  <li key={i.id} className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 py-2 text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-ink">{i.typeName}</p>
                      <p className="text-xs text-slate-500">
                        {formatDateTime(i.createdAt)} · {i.origin === 'Manual' ? `pedida por ${i.requestedBy ?? 'colaborador'}` : 'renovação automática'}
                        {i.attempts > 1 && ` · ${i.attempts} tentativas`}
                      </p>
                      {i.message && i.status !== 'Emitida' && (
                        <p className={i.status === 'Falha' ? 'mt-0.5 text-xs text-red-700' : 'mt-0.5 text-xs text-slate-600'}>
                          {i.message}
                          {i.status === 'Pendente' && i.nextAttemptAt && ` Nova tentativa em ${formatDateTime(i.nextAttemptAt)}.`}
                        </p>
                      )}
                    </div>
                    <Badge tone={s.tone} className="gap-1">
                      <Icon className="h-3 w-3" />
                      {s.label}
                    </Badge>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </div>
    </Card>
  )
}
