import { useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { CalendarClock, HeartPulse, UserX } from 'lucide-react'
import { Badge, EmptyState, Modal, Skeleton, Tabs } from '@/components/ui'
import { requestKeys, requestsApi, type RequestFilters } from '@/features/requests/api'
import { Pager, RequestsTable } from '@/features/requests/components/RequestsTable'
import { enumLabels, statusMeta } from '@/features/requests/meta'
import { formatDate } from '@/lib/format'
import type { Employee, EmployeeRecord, EmployeeRecordOrigin } from '@/types/domain'
import { employeeKeys, employeesApi } from '../api'
import { bondLabels, formatCpf, statusLabels } from '../meta'

type Tab = 'resumo' | 'ferias' | 'afastamentos' | 'rubricas' | 'solicitacoes'

interface Props {
  companyId: string
  employee: Employee | null
  office?: boolean
  onClose: () => void
  requestHref: (requestId: string) => string
}

/** Detalhes do empregado: cadastro, situação de hoje e histórico vindo das solicitações. */
export function EmployeeDetailModal({ companyId, employee, office, onClose, requestHref }: Props) {
  const [tab, setTab] = useState<Tab>('resumo')
  const { data, isLoading } = useQuery({
    queryKey: employeeKeys.record(companyId, employee?.id ?? ''),
    queryFn: () => employeesApi.record(companyId, employee!.id),
    enabled: !!employee,
  })
  const close = () => {
    setTab('resumo')
    onClose()
  }
  const e = data?.employee ?? employee
  const s = e ? statusLabels[e.status] : null

  return (
    <Modal open={!!employee} onClose={close} title={e?.name ?? ''} description={e?.role ?? undefined} size="lg">
      {s && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Badge tone={s.tone}>{s.label}</Badge>
          {data?.today.vacation && <Badge tone="info">Em férias</Badge>}
          {data?.today.leave && <Badge tone="warning">Afastado</Badge>}
        </div>
      )}
      <Tabs
        className="mb-4 overflow-x-auto"
        value={tab}
        onChange={setTab}
        items={[
          { value: 'resumo', label: 'Resumo' },
          { value: 'ferias', label: 'Férias', count: data?.vacations.length || undefined },
          { value: 'afastamentos', label: 'Afastamentos', count: data?.leaves.length || undefined },
          { value: 'rubricas', label: 'Rubricas', count: data?.payroll.length || undefined },
          { value: 'solicitacoes', label: 'Solicitações', count: data?.totalRequests || undefined },
        ]}
      />
      {isLoading || !data ? (
        <Skeleton className="h-48" />
      ) : tab === 'resumo' ? (
        <Summary record={data} requestHref={requestHref} />
      ) : tab === 'ferias' ? (
        <Rows
          empty="Nenhuma férias informada."
          head={['Gozo', 'Dias', 'Período aquisitivo', 'Solicitação']}
          rows={data.vacations.map((v) => [
            `${formatDate(v.start)} a ${formatDate(v.end)}`,
            `${v.days}${v.sellTenDays ? ' + abono' : ''}`,
            `${formatDate(v.accrualStart)} a ${formatDate(v.accrualEnd)}`,
            <Origin key="o" origin={v.origin} href={requestHref} office={office} />,
          ])}
        />
      ) : tab === 'afastamentos' ? (
        <Rows
          empty="Nenhum afastamento informado."
          head={['Motivo', 'Início', 'Previsão de retorno', 'Solicitação']}
          rows={data.leaves.map((l) => [
            enumLabels[l.reason] ?? l.reason,
            formatDate(l.start),
            l.expectedReturn ? formatDate(l.expectedReturn) : '—',
            <Origin key="o" origin={l.origin} href={requestHref} office={office} />,
          ])}
        />
      ) : tab === 'rubricas' ? (
        <Rows
          empty="Nenhum lançamento de rubrica."
          head={['Competência', 'Rubrica', 'Qtd.', 'Valor', 'Solicitação']}
          rows={data.payroll.map((p) => [
            formatDate(p.period, 'MM/yyyy'),
            p.item,
            p.quantity?.toLocaleString('pt-BR') ?? '—',
            p.amount?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) ?? '—',
            <Origin key="o" origin={p.origin} href={requestHref} office={office} />,
          ])}
        />
      ) : (
        <EmployeeRequests companyId={companyId} employeeId={data.employee.id} office={office} requestHref={requestHref} />
      )}
    </Modal>
  )
}

function Summary({ record: r, requestHref }: { record: EmployeeRecord; requestHref: (id: string) => string }) {
  const e = r.employee
  const fields: [string, string | null][] = [
    ['CPF', e.cpf ? formatCpf(e.cpf) : null],
    ['Matrícula', e.registration],
    ['Cargo / função', e.role],
    ['Vínculo', bondLabels[e.bond]],
    ['Admissão / início', e.admissionDate && formatDate(e.admissionDate)],
    ['Desligamento', e.terminationDate && formatDate(e.terminationDate)],
    ['E-mail', e.email],
    ['Telefone', e.phone],
  ]
  const alerts: { icon: ReactNode; text: string; href: string }[] = []
  if (r.today.vacation)
    alerts.push({
      icon: <CalendarClock className="h-4 w-4" />,
      text: `Em férias de ${formatDate(r.today.vacation.start)} a ${formatDate(r.today.vacation.end)}.`,
      href: requestHref(r.today.vacation.origin.requestId),
    })
  if (r.today.leave)
    alerts.push({
      icon: <HeartPulse className="h-4 w-4" />,
      text: `Afastado desde ${formatDate(r.today.leave.start)} (${enumLabels[r.today.leave.reason] ?? r.today.leave.reason})${
        r.today.leave.expectedReturn ? `, retorno previsto em ${formatDate(r.today.leave.expectedReturn)}` : ''
      }.`,
      href: requestHref(r.today.leave.origin.requestId),
    })
  if (r.today.nextVacation)
    alerts.push({
      icon: <CalendarClock className="h-4 w-4" />,
      text: `Próximas férias: ${formatDate(r.today.nextVacation.start)} a ${formatDate(r.today.nextVacation.end)}.`,
      href: requestHref(r.today.nextVacation.origin.requestId),
    })
  const t = r.terminations.find((x) => x.origin.status !== 'Canceled')
  if (t)
    alerts.push({
      icon: <UserX className="h-4 w-4" />,
      text: `Desligamento em ${formatDate(t.date)} (${enumLabels[t.kind] ?? t.kind}, aviso ${(enumLabels[t.notice] ?? t.notice).toLowerCase()}).`,
      href: requestHref(t.origin.requestId),
    })

  return (
    <div className="space-y-4">
      {alerts.length > 0 && (
        <ul className="space-y-2">
          {alerts.map((a) => (
            <li key={a.text} className="flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-ink">
              <span className="mt-0.5 text-brand-700">{a.icon}</span>
              <Link to={a.href} className="hover:underline">
                {a.text}
              </Link>
            </li>
          ))}
        </ul>
      )}
      <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
        {fields.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-slate-500">{label}</dt>
            <dd className="text-ink">{value || '—'}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function Origin({ origin: o, href, office }: { origin: EmployeeRecordOrigin; href: (id: string) => string; office?: boolean }) {
  const m = statusMeta[o.status]
  return (
    <Link to={href(o.requestId)} className="whitespace-nowrap text-brand-700 hover:underline">
      #{o.number} <span className="text-xs text-slate-500">· {office ? m.officeLabel : m.label}</span>
    </Link>
  )
}

function Rows({ head, rows, empty }: { head: string[]; rows: ReactNode[][]; empty: string }) {
  if (!rows.length) return <EmptyState title={empty} />
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-xs text-slate-500">
          <tr>
            {head.map((h) => (
              <th key={h} className="py-1.5 pr-3 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j} className="py-2 pr-3">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const PAGE = 10

function EmployeeRequests({
  companyId,
  employeeId,
  office,
  requestHref,
}: {
  companyId: string
  employeeId: string
  office?: boolean
  requestHref: (id: string) => string
}) {
  const [page, setPage] = useState(1)
  const f: RequestFilters = { employeeId, sortBy: 'createdAt', sortDesc: true, page, pageSize: PAGE }
  const { data, isLoading } = useQuery({ queryKey: requestKeys.list(companyId, f), queryFn: () => requestsApi.list(companyId, f) })
  const items = data?.items ?? []
  if (isLoading) return <Skeleton className="h-32" />
  if (!items.length) return <EmptyState title="Nenhuma solicitação para este empregado." />
  return (
    <div className="-mx-5">
      <RequestsTable items={items} office={office} hrefOf={(r) => requestHref(r.id)} />
      <Pager page={page} total={data?.total ?? 0} pageSize={PAGE} onPage={setPage} />
    </div>
  )
}
