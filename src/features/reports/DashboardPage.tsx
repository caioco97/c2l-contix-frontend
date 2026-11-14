import { useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import { AlertTriangle, BarChart3, Building2, ClipboardCheck, FileText, Headset, ShieldAlert } from 'lucide-react'
import { Card, CardBody, CardHeader, FormField, Input, Select, Skeleton } from '@/components/ui'
import { DEPARTMENTS, statusMeta } from '@/features/requests/meta'
import { STATUS_FROM_API } from '@/features/requests/api'
import { cn } from '@/lib/cn'
import { formatDateTime } from '@/lib/format'
import type { Department } from '@/types/domain'
import { reportKeys, reportsApi, type DashboardFilters } from './api'
import { currentMonth } from './period'

/** Painel do escritório (CTX-72): o mês de trabalho em números, com atalhos para as listas. */
export function DashboardPage() {
  const [range, setRange] = useState(currentMonth)
  const [department, setDepartment] = useState('')
  const filters: DashboardFilters = { ...range, department: (department || undefined) as Department | undefined }
  const { data: d, isLoading } = useQuery({
    queryKey: reportKeys.dashboard(filters),
    queryFn: () => reportsApi.dashboard(filters),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  })

  const maxStatus = Math.max(1, ...(d?.requestsByStatus ?? []).map((s) => s.total))
  const donePct = d && d.tasksInPeriod > 0 ? Math.round((d.tasksDoneInPeriod / d.tasksInPeriod) * 100) : null

  return (
    <main className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink">Painel</h1>
          <p className="text-sm text-slate-500">
            {d ? `Atualizado em ${formatDateTime(d.updatedAt)}.` : 'Como está o trabalho do escritório.'}{' '}
            <Link to="/relatorios" className="font-medium text-brand-700 hover:underline">
              Ver relatórios
            </Link>
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-[150px_150px_200px]">
          <FormField label="De" htmlFor="dash-from">
            <Input
              id="dash-from"
              type="date"
              value={range.from}
              onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
            />
          </FormField>
          <FormField label="Até" htmlFor="dash-until">
            <Input
              id="dash-until"
              type="date"
              value={range.until}
              onChange={(e) => setRange((r) => ({ ...r, until: e.target.value }))}
            />
          </FormField>
          <div className="col-span-2 sm:col-span-1">
            <FormField label="Departamento" htmlFor="dash-dept">
              <Select
                id="dash-dept"
                placeholder="Todos"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                options={DEPARTMENTS}
              />
            </FormField>
          </div>
        </div>
      </div>

      {isLoading || !d ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Tile icon={<Building2 />} label="Clientes ativos" value={d.activeClients} to="/empresas" />
            <Tile
              icon={<Headset />}
              label="Solicitações em aberto"
              value={d.openRequests}
              hint={`${d.requestsInPeriod} aberta(s) no período`}
              alert={d.overdueRequests > 0 ? `${d.overdueRequests} atrasada(s)` : undefined}
              to="/atendimento"
            />
            <Tile
              icon={<ClipboardCheck />}
              label="Tarefas em aberto"
              value={d.openTasks}
              hint={donePct === null ? 'Nenhuma com prazo no período' : `${donePct}% das do período concluídas`}
              alert={d.overdueTasks > 0 ? `${d.overdueTasks} atrasada(s)` : undefined}
              to="/tarefas"
            />
            <Tile
              icon={<ShieldAlert />}
              label="CNDs a vencer em 30 dias"
              value={d.cndsExpiring}
              alert={d.cndsExpired > 0 ? `${d.cndsExpired} vencida(s)` : undefined}
              to="/certidoes"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader title="Solicitações do período por status" icon={<BarChart3 className="h-5 w-5" />} />
              <CardBody>
                {d.requestsByStatus.length === 0 ? (
                  <p className="text-sm text-slate-500">Nenhuma solicitação aberta no período.</p>
                ) : (
                  <ul className="space-y-3">
                    {d.requestsByStatus.map((s) => {
                      const meta = statusMeta[STATUS_FROM_API[s.status]]
                      return (
                        <li key={s.status}>
                          <div className="mb-1 flex justify-between text-sm">
                            <span className="text-slate-700">{meta?.officeLabel ?? s.status}</span>
                            <span className="font-semibold tabular-nums text-ink">{s.total}</span>
                          </div>
                          <div className="h-2 rounded-full bg-slate-100">
                            <div className="h-2 rounded-full bg-brand-600" style={{ width: `${(s.total / maxStatus) * 100}%` }} />
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Documentos e tarefas do período" icon={<FileText className="h-5 w-5" />} />
              <CardBody>
                <dl className="grid grid-cols-2 gap-4">
                  <Stat label="Documentos publicados" value={d.documentsPublished} />
                  <Stat
                    label="Ainda não abertos pelo cliente"
                    value={d.documentsUnread}
                    warn={d.documentsUnread > 0 && d.documentsUnread >= d.documentsPublished / 2}
                  />
                  <Stat label="Tarefas com prazo no período" value={d.tasksInPeriod} />
                  <Stat label="Concluídas" value={d.tasksDoneInPeriod} />
                </dl>
              </CardBody>
            </Card>
          </div>
        </>
      )}
    </main>
  )
}

function Tile({
  icon,
  label,
  value,
  hint,
  alert,
  to,
}: {
  icon: ReactNode
  label: string
  value: number
  hint?: string
  alert?: string
  to: string
}) {
  return (
    <Link
      to={to}
      className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-brand-300 hover:shadow"
    >
      <div className="flex items-center justify-between text-slate-500">
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
        <span className="text-brand-600 [&>svg]:h-5 [&>svg]:w-5">{icon}</span>
      </div>
      <p className="mt-2 text-3xl font-semibold tabular-nums text-ink">{value}</p>
      {alert ? (
        <p className="mt-1 flex items-center gap-1 text-sm font-medium text-red-600">
          <AlertTriangle className="h-4 w-4" /> {alert}
        </p>
      ) : (
        hint && <p className="mt-1 text-sm text-slate-500">{hint}</p>
      )}
    </Link>
  )
}

function Stat({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className={cn('mt-1 text-2xl font-semibold tabular-nums', warn ? 'text-amber-600' : 'text-ink')}>{value}</dd>
    </div>
  )
}
