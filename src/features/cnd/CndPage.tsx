import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, CalendarClock, Download, Pencil, Plus, RefreshCw, ShieldAlert, ShieldCheck, Trash2 } from 'lucide-react'
import {
  Badge,
  Button,
  Card,
  Checkbox,
  ConfirmModal,
  EmptyState,
  Select,
  Skeleton,
  Table,
  TBody,
  Td,
  Th,
  THead,
  Tr,
  Tabs,
  useToast,
} from '@/components/ui'
import { useAuth } from '@/features/auth/AuthContext'
import { CompanyContextBar, CompanyGate } from '@/features/companies/CompanySelector'
import { useActiveCompany } from '@/features/companies/ActiveCompanyContext'
import { getErrorMessage } from '@/lib/api'
import { cn } from '@/lib/cn'
import { formatDate } from '@/lib/format'
import type { Cnd, CndInput, CndType } from '@/types/domain'
import { CND_SITUATIONS, cndApi, cndKeys } from './api'
import { CndFormModal } from './components/CndFormModal'
import { CndStatusBadge } from './components/CndStatusBadge'
import { expiryText } from './format'
import { useDownloadCnd } from './hooks'

type View = 'company' | 'dashboard'
type Editing = { companyId: string; companyName: string; cnd?: Cnd; type?: CndType } | null

const situationLabel = (s: Cnd['situation']) => CND_SITUATIONS.find((x) => x.value === s)?.label ?? s

/** Certidões negativas: lista da empresa ativa (cliente e escritório) e painel de vencimentos (escritório). */
export function CndPage() {
  const { user } = useAuth()
  const { company, setCompany } = useActiveCompany()
  const isOffice = !!user && user.role !== 'Client'
  const [view, setView] = useState<View>('company')
  const [editing, setEditing] = useState<Editing>(null)
  const queryClient = useQueryClient()
  const toast = useToast()

  const save = useMutation({
    mutationFn: ({ target, input }: { target: NonNullable<Editing>; input: CndInput }) =>
      target.cnd ? cndApi.update(target.companyId, target.cnd.id, input) : cndApi.create(target.companyId, input),
    onSuccess: (_, { target }) => {
      toast.success(target.cnd ? 'Certidão atualizada.' : 'Certidão cadastrada.')
      queryClient.invalidateQueries({ queryKey: cndKeys.all })
      setEditing(null)
    },
    onError: (e) => toast.error(getErrorMessage(e, 'Não foi possível salvar a certidão.')),
  })

  return (
    <>
      <CompanyContextBar />
      <main className="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-ink">Certidões negativas (CND)</h1>
            <p className="text-sm text-slate-500">
              {isOffice
                ? 'Controle a regularidade das empresas e acompanhe os vencimentos.'
                : 'Consulte e baixe as certidões da sua empresa.'}
            </p>
          </div>
          {isOffice && view === 'company' && company && (
            <Button onClick={() => setEditing({ companyId: company.id, companyName: company.tradeName })}>
              <Plus className="h-4 w-4" /> Nova certidão
            </Button>
          )}
        </div>

        {isOffice && (
          <Tabs
            items={[
              { value: 'company', label: 'Certidões da empresa' },
              { value: 'dashboard', label: 'Painel de vencimentos' },
            ]}
            value={view}
            onChange={setView}
          />
        )}

        {view === 'dashboard' && isOffice ? (
          <Dashboard
            onRenew={(c) => setEditing({ companyId: c.companyId, companyName: c.companyName, type: c.type })}
            onOpenCompany={(id) => {
              setCompany(id)
              setView('company')
            }}
          />
        ) : (
          <CompanyGate purpose="consultar as certidões negativas">
            {(company) => (
              <CompanyCnds
                companyId={company.id}
                isOffice={isOffice}
                onEdit={(c) => setEditing({ companyId: company.id, companyName: company.tradeName, cnd: c })}
                onRenew={(c) => setEditing({ companyId: company.id, companyName: company.tradeName, type: c.type })}
              />
            )}
          </CompanyGate>
        )}
      </main>

      <CndFormModal
        open={!!editing}
        cnd={editing?.cnd}
        initialType={editing?.type}
        companyName={editing?.companyName}
        onClose={() => setEditing(null)}
        onSubmit={(input) => save.mutateAsync({ target: editing!, input }).then(() => undefined, () => undefined)}
      />
    </>
  )
}

function CompanyCnds({
  companyId,
  isOffice,
  onEdit,
  onRenew,
}: {
  companyId: string
  isOffice: boolean
  onEdit: (c: Cnd) => void
  onRenew: (c: Cnd) => void
}) {
  const [history, setHistory] = useState(false)
  const [removing, setRemoving] = useState<Cnd | null>(null)
  const { data = [], isLoading } = useQuery({
    queryKey: cndKeys.list(companyId, history),
    queryFn: () => cndApi.list(companyId, history),
  })
  const download = useDownloadCnd()
  const queryClient = useQueryClient()
  const toast = useToast()
  const remove = useMutation({
    mutationFn: (c: Cnd) => cndApi.remove(companyId, c.id),
    onSuccess: () => {
      toast.success('Certidão excluída.')
      queryClient.invalidateQueries({ queryKey: cndKeys.all })
      setRemoving(null)
    },
    onError: (e) => toast.error(getErrorMessage(e, 'Não foi possível excluir.')),
  })

  return (
    <Card>
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <p className="text-sm text-slate-500">
          {history ? 'Todas as certidões já registradas.' : 'Certidão mais recente de cada tipo.'}
        </p>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <Checkbox checked={history} onChange={(e) => setHistory(e.target.checked)} /> Mostrar histórico
        </label>
      </div>
      {isLoading ? (
        <div className="space-y-2 p-4">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
      ) : data.length === 0 ? (
        <EmptyState
          className="m-4"
          icon={<ShieldCheck className="h-8 w-8" />}
          title="Nenhuma certidão cadastrada para esta empresa"
          description={isOffice ? 'Use "Nova certidão" para registrar a primeira.' : undefined}
        />
      ) : (
        <Table>
          <THead>
            <tr>
              <Th>Certidão</Th>
              <Th>Situação</Th>
              <Th>Emissão</Th>
              <Th>Validade</Th>
              <Th>Status</Th>
              <Th className="text-right">Ações</Th>
            </tr>
          </THead>
          <TBody>
            {data.map((c) => (
              <Tr key={c.id} className={cn(!c.isCurrent && 'text-slate-400')}>
                <Td>
                  <p className="flex flex-wrap items-center gap-2 font-medium text-ink">
                    {c.typeName}
                    {c.autoIssued && <Badge tone="brand">Automática</Badge>}
                  </p>
                  {c.number && <p className="text-xs text-slate-500">Nº {c.number}</p>}
                </Td>
                <Td>{situationLabel(c.situation)}</Td>
                <Td>{formatDate(c.issuedAt)}</Td>
                <Td>
                  <p>{formatDate(c.validUntil)}</p>
                  {c.isCurrent && <p className="text-xs text-slate-500">{expiryText(c)}</p>}
                </Td>
                <Td>{c.isCurrent ? <CndStatusBadge status={c.status} /> : <Badge>Histórico</Badge>}</Td>
                <Td>
                  <div className="flex justify-end gap-1">
                    {c.hasFile && (
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Baixar ${c.typeName}`}
                        loading={download.isPending && download.variables?.id === c.id}
                        onClick={() => download.mutate(c)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                    {isOffice && (
                      <>
                        {c.isCurrent && c.status !== 'Regular' && (
                          <Button variant="ghost" size="icon" aria-label="Registrar renovação" title="Registrar renovação" onClick={() => onRenew(c)}>
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" aria-label="Editar" onClick={() => onEdit(c)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" aria-label="Excluir" onClick={() => setRemoving(c)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      )}
      <ConfirmModal
        open={!!removing}
        title="Excluir certidão"
        description={`A certidão ${removing?.typeName ?? ''} com validade ${formatDate(removing?.validUntil)} deixará de aparecer para o cliente.`}
        loading={remove.isPending}
        onConfirm={() => removing && remove.mutate(removing)}
        onClose={() => setRemoving(null)}
      />
    </Card>
  )
}

function StatTile({ label, value, tone, icon }: { label: string; value: number; tone: 'danger' | 'warning' | 'neutral'; icon: React.ReactNode }) {
  const tones = { danger: 'text-red-700 bg-red-50', warning: 'text-amber-700 bg-amber-50', neutral: 'text-slate-700 bg-slate-50' }
  return (
    <Card className="flex items-center gap-3 p-4">
      <span className={cn('rounded-lg p-2', tones[tone])}>{icon}</span>
      <div>
        <p className="text-2xl font-semibold tabular-nums text-ink">{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </Card>
  )
}

function Dashboard({ onRenew, onOpenCompany }: { onRenew: (c: Cnd) => void; onOpenCompany: (companyId: string) => void }) {
  const [days, setDays] = useState(30)
  const { data, isLoading } = useQuery({ queryKey: cndKeys.dashboard(days), queryFn: () => cndApi.dashboard(days) })
  const download = useDownloadCnd()

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Vencidas" value={data?.expired ?? 0} tone="danger" icon={<AlertTriangle className="h-5 w-5" />} />
        <StatTile label="A vencer em 15 dias" value={data?.expiring15 ?? 0} tone="warning" icon={<CalendarClock className="h-5 w-5" />} />
        <StatTile label="A vencer em 30 dias" value={data?.expiring30 ?? 0} tone="warning" icon={<CalendarClock className="h-5 w-5" />} />
        <StatTile label="Positivas (irregulares)" value={data?.irregular ?? 0} tone="neutral" icon={<ShieldAlert className="h-5 w-5" />} />
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <p className="text-sm text-slate-500">Certidões atuais que exigem atenção, de todas as empresas.</p>
          <div className="w-44">
            <Select
              aria-label="Período"
              value={String(days)}
              onChange={(e) => setDays(Number(e.target.value))}
              options={[15, 30, 60, 90].map((d) => ({ value: String(d), label: `Próximos ${d} dias` }))}
            />
          </div>
        </div>
        {isLoading ? (
          <div className="space-y-2 p-4">
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
        ) : !data || data.items.length === 0 ? (
          <EmptyState className="m-4" icon={<ShieldCheck className="h-8 w-8" />} title="Nenhuma certidão vencida ou a vencer no período" />
        ) : (
          <Table>
            <THead>
              <tr>
                <Th>Empresa</Th>
                <Th>Certidão</Th>
                <Th>Validade</Th>
                <Th>Status</Th>
                <Th className="text-right">Ações</Th>
              </tr>
            </THead>
            <TBody>
              {data.items.map((c) => (
                <Tr key={c.id}>
                  <Td>
                    <button type="button" className="font-medium text-brand-700 hover:underline" onClick={() => onOpenCompany(c.companyId)}>
                      {c.companyName}
                    </button>
                  </Td>
                  <Td>
                    <span className="flex flex-wrap items-center gap-2">
                      {c.typeName}
                      {c.autoIssued && <Badge tone="brand">Automática</Badge>}
                    </span>
                  </Td>
                  <Td>
                    <p>{formatDate(c.validUntil)}</p>
                    <p className="text-xs text-slate-500">{expiryText(c)}</p>
                  </Td>
                  <Td>
                    <CndStatusBadge status={c.status} />
                  </Td>
                  <Td>
                    <div className="flex justify-end gap-1">
                      {c.hasFile && (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Baixar ${c.typeName}`}
                          loading={download.isPending && download.variables?.id === c.id}
                          onClick={() => download.mutate(c)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="secondary" size="sm" onClick={() => onRenew(c)}>
                        <RefreshCw className="h-4 w-4" /> Renovar
                      </Button>
                    </div>
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </div>
  )
}
