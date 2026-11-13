import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Building2, FileUp, Pencil, Trash2, UserPlus } from 'lucide-react'
import { Badge, Button, Card, CardBody, CardHeader, EmptyState, Skeleton, Tabs, useToast } from '@/components/ui'
import { useAuth } from '@/features/auth/AuthContext'
import { getErrorMessage } from '@/lib/api'
import { formatCnpj, formatDate } from '@/lib/format'
import type { CompanyDetail, CompanyInput, CompanyPanel } from '@/types/domain'
import { useActiveCompany } from '../ActiveCompanyContext'
import { companiesApi, companyKeys } from '../api'
import { CompanyFormModal } from '../components/CompanyFormModal'
import { CompanyUsersTab } from '../components/CompanyUsersTab'
import { DeleteCompanyModal } from '../components/DeleteCompanyModal'
import { CndTab, DocumentsTab, HistoryTab, RequestsTab } from '../components/CompanyActivityTabs'
import { regimeLabel, statusOf } from '../meta'

const TABS = ['dados', 'usuarios', 'documentos', 'solicitacoes', 'cnd', 'historico'] as const
type Tab = (typeof TABS)[number]

/** Página da empresa para o escritório: cadastro, usuários do portal e tudo o que aconteceu com ela. */
export function CompanyDetailPage() {
  const { companyId = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const toast = useToast()
  const queryClient = useQueryClient()
  const { setCompany } = useActiveCompany()
  const [editing, setEditing] = useState(false)
  const [inviting, setInviting] = useState(false)
  const [removing, setRemoving] = useState(false)
  const { user } = useAuth()
  const isAdmin = user?.role === 'Admin'

  const raw = params.get('aba')
  const tab: Tab = TABS.includes(raw as Tab) ? (raw as Tab) : 'dados'
  const setTab = (t: Tab) =>
    setParams(
      (p) => {
        p.set('aba', t)
        return p
      },
      { replace: true },
    )

  const company = useQuery({ queryKey: companyKeys.detail(companyId), queryFn: () => companiesApi.get(companyId) })
  const panel = useQuery({ queryKey: companyKeys.panel(companyId), queryFn: () => companiesApi.panel(companyId) })

  const update = useMutation({
    mutationFn: (input: CompanyInput) => companiesApi.update(companyId, input),
    onSuccess: () => {
      toast.success('Empresa atualizada.')
      queryClient.invalidateQueries({ queryKey: companyKeys.all })
      setEditing(false)
    },
    onError: (e) => toast.error(getErrorMessage(e, 'Não foi possível salvar a empresa.')),
  })

  /** Abre uma tela do portal (documentos, certidões) já com esta empresa selecionada. */
  const openAs = (path: string) => {
    setCompany(companyId)
    navigate(path)
  }

  if (company.isLoading) {
    return (
      <main className="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-64" />
      </main>
    )
  }

  if (!company.data) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <EmptyState
          icon={<Building2 className="h-8 w-8" />}
          title="Empresa não encontrada."
          action={
            <Link to="/empresas" className="text-sm font-medium text-brand-700 hover:underline">
              Voltar para Empresas
            </Link>
          }
        />
      </main>
    )
  }

  const c = company.data
  const s = statusOf(c.status)
  const p = panel.data

  return (
    <main className="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6">
      <Link to="/empresas" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Empresas
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-xl font-semibold text-ink">{c.tradeName || c.legalName}</h1>
            <Badge tone={s.tone}>{s.label}</Badge>
          </div>
          <p className="text-sm text-slate-500">
            {c.tradeName ? `${c.legalName} · ` : ''}
            <span className="font-mono">{formatCnpj(c.document)}</span> · {regimeLabel(c.taxRegime)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => openAs('/documentos')}>
            <FileUp className="h-4 w-4" /> Enviar documento
          </Button>
          <Button
            onClick={() => {
              setTab('usuarios')
              setInviting(true)
            }}
          >
            <UserPlus className="h-4 w-4" /> Convidar usuário
          </Button>
          {isAdmin && (
            <Button variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => setRemoving(true)}>
              <Trash2 className="h-4 w-4" /> Excluir
            </Button>
          )}
        </div>
      </div>

      <Tabs
        className="overflow-x-auto"
        value={tab}
        onChange={setTab}
        items={[
          { value: 'dados', label: 'Visão geral' },
          { value: 'usuarios', label: 'Usuários', count: p?.pendingInvites },
          { value: 'documentos', label: 'Documentos', count: p?.receivedUnread },
          { value: 'solicitacoes', label: 'Solicitações', count: p?.openRequests },
          { value: 'cnd', label: 'Certidões', count: p ? p.expiredCnds + p.expiringCnds : undefined },
          { value: 'historico', label: 'Histórico' },
        ]}
      />

      {tab === 'dados' && <Overview company={c} panel={p} loading={panel.isLoading} onEdit={() => setEditing(true)} onTab={setTab} />}
      {tab === 'usuarios' && (
        <CompanyUsersTab companyId={companyId} companyName={c.legalName} inviting={inviting} onInvitingChange={setInviting} />
      )}
      {tab === 'documentos' && <DocumentsTab companyId={companyId} onOpen={() => openAs('/documentos')} />}
      {tab === 'solicitacoes' && <RequestsTab companyId={companyId} />}
      {tab === 'cnd' && <CndTab companyId={companyId} onManage={() => openAs('/certidoes')} />}
      {tab === 'historico' && <HistoryTab companyId={companyId} />}

      <CompanyFormModal
        open={editing}
        company={c}
        onClose={() => setEditing(false)}
        onSubmit={(input) => update.mutateAsync(input).then(() => undefined, () => undefined)}
      />

      <DeleteCompanyModal
        company={removing ? c : null}
        onClose={() => setRemoving(false)}
        onDeleted={() => navigate('/empresas', { replace: true })}
      />
    </main>
  )
}

function Overview({
  company: c,
  panel,
  loading,
  onEdit,
  onTab,
}: {
  company: CompanyDetail
  panel?: CompanyPanel
  loading: boolean
  onEdit: () => void
  onTab: (t: Tab) => void
}) {
  const tiles: { label: string; value?: number; hint?: string; tab: Tab; alert?: boolean }[] = [
    {
      label: 'Usuários ativos',
      value: panel?.activeUsers,
      hint: panel?.pendingInvites ? `${panel.pendingInvites} convite(s) pendente(s)` : undefined,
      tab: 'usuarios',
    },
    {
      label: 'Documentos não vistos pelo cliente',
      value: panel?.documentsNotSeenByClient,
      hint: panel?.receivedUnread ? `${panel.receivedUnread} recebido(s) do cliente sem leitura` : undefined,
      tab: 'documentos',
    },
    {
      label: 'Solicitações em aberto',
      value: panel?.openRequests,
      hint: panel?.overdueRequests ? `${panel.overdueRequests} atrasada(s)` : undefined,
      tab: 'solicitacoes',
      alert: !!panel?.overdueRequests,
    },
    {
      label: 'Certidões vencidas',
      value: panel?.expiredCnds,
      hint: panel?.expiringCnds ? `${panel.expiringCnds} vencendo em 30 dias` : undefined,
      tab: 'cnd',
      alert: !!panel?.expiredCnds,
    },
  ]

  const a = c.address
  const address = a
    ? [
        [a.street, a.number].filter(Boolean).join(', '),
        a.complement,
        a.district,
        [a.city, a.state].filter(Boolean).join(' / '),
        a.zip,
      ]
        .filter(Boolean)
        .join(' · ')
    : ''

  const rows: [string, string | null | undefined][] = [
    ['Razão social', c.legalName],
    ['Nome fantasia', c.tradeName],
    ['Apelido', c.nickname],
    ['CNPJ / CPF', formatCnpj(c.document)],
    ['Inscrição estadual', c.stateRegistration],
    ['Inscrição municipal', c.cityRegistration],
    ['Regime tributário', regimeLabel(c.taxRegime)],
    ['E-mail', c.email],
    ['Telefone', c.phone],
    ['Endereço', address],
    ['Cliente desde', formatDate(c.createdAt)],
  ]

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((t) => (
          <button
            key={t.label}
            type="button"
            onClick={() => onTab(t.tab)}
            className="rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-colors hover:border-brand-300"
          >
            <p className="text-xs font-medium text-slate-500">{t.label}</p>
            {loading ? (
              <Skeleton className="mt-2 h-7 w-12" />
            ) : (
              <p className={t.alert ? 'mt-1 text-2xl font-semibold text-red-600' : 'mt-1 text-2xl font-semibold text-ink'}>
                {t.value ?? 0}
              </p>
            )}
            {t.hint && <p className="mt-1 text-xs text-slate-500">{t.hint}</p>}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader
          title="Dados cadastrais"
          action={
            <Button variant="secondary" size="sm" onClick={onEdit}>
              <Pencil className="h-4 w-4" /> Editar
            </Button>
          }
        />
        <CardBody>
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {rows.map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs text-slate-500">{label}</dt>
                <dd className="text-sm text-ink">{value || '—'}</dd>
              </div>
            ))}
          </dl>
        </CardBody>
      </Card>
    </div>
  )
}
