import { useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { FormField, Input, SegmentedControl, Select } from '@/components/ui'
import { companiesApi } from '@/features/companies/api'
import { requestKeys, requestsApi } from '@/features/requests/api'
import { DEPARTMENTS } from '@/features/requests/meta'
import type { Department } from '@/types/domain'
import { reportKeys, reportsApi, type ReportFilters, type ReportType } from './api'
import { ReportView } from './components/ReportView'
import { currentMonth } from './period'

const TYPES: { value: ReportType; label: string; period: string }[] = [
  { value: 'Solicitacoes', label: 'Solicitações', period: 'abertas' },
  { value: 'Tarefas', label: 'Tarefas', period: 'com prazo interno' },
  { value: 'Documentos', label: 'Documentos', period: 'publicados' },
]

const STATUS: Record<ReportType, { value: string; label: string }[]> = {
  Solicitacoes: [
    { value: 'Aberta', label: 'Aberta' },
    { value: 'EmAnalise', label: 'Em análise' },
    { value: 'AguardandoCliente', label: 'Aguardando cliente' },
    { value: 'Concluida', label: 'Concluída' },
    { value: 'Cancelada', label: 'Cancelada' },
  ],
  Tarefas: [
    { value: 'Pendente', label: 'Pendente' },
    { value: 'EmAndamento', label: 'Em andamento' },
    { value: 'Concluida', label: 'Concluída' },
    { value: 'Cancelada', label: 'Cancelada' },
  ],
  Documentos: [],
}

/** Relatórios do escritório (CTX-73): prévia na tela e exportação em CSV ou PDF. */
export function ReportsPage() {
  const [type, setType] = useState<ReportType>('Solicitacoes')
  const [range, setRange] = useState(currentMonth)
  const [companyId, setCompanyId] = useState('')
  const [department, setDepartment] = useState('')
  const [assigneeId, setAssigneeId] = useState('')
  const [status, setStatus] = useState('')

  const companies = useQuery({ queryKey: ['companies', 'mine'], queryFn: companiesApi.listMine })
  const users = useQuery({ queryKey: requestKeys.officeUsers, queryFn: requestsApi.officeUsers, staleTime: 5 * 60_000 })

  const filters: ReportFilters = {
    ...range,
    companyId: companyId || undefined,
    department: type === 'Documentos' ? undefined : ((department || undefined) as Department | undefined),
    assigneeId: type === 'Documentos' ? undefined : assigneeId || undefined,
    status: status || undefined,
  }
  const preview = useQuery({
    queryKey: reportKeys.preview(type, filters),
    queryFn: () => reportsApi.preview(type, filters),
    placeholderData: keepPreviousData,
    enabled: !!range.from && !!range.until,
  })
  const meta = TYPES.find((t) => t.value === type)!

  return (
    <main className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to="/painel" className="text-sm text-slate-500 hover:text-ink">
            Painel
          </Link>
          <h1 className="text-xl font-semibold text-ink">Relatórios</h1>
          <p className="text-sm text-slate-500">
            {meta.label} {meta.period} no período. A tela mostra até 200 linhas; o CSV e o PDF trazem tudo.
          </p>
        </div>
        <SegmentedControl
          items={TYPES}
          value={type}
          onChange={(t) => {
            setType(t)
            setStatus('')
          }}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <FormField label="De" htmlFor="rep-from">
          <Input
            id="rep-from"
            type="date"
            value={range.from}
            onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
          />
        </FormField>
        <FormField label="Até" htmlFor="rep-until">
          <Input
            id="rep-until"
            type="date"
            value={range.until}
            onChange={(e) => setRange((r) => ({ ...r, until: e.target.value }))}
          />
        </FormField>
        <FormField label="Empresa" htmlFor="rep-company">
          <Select
            id="rep-company"
            placeholder="Todas"
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value)}
            options={(companies.data ?? []).map((c) => ({ value: c.id, label: c.tradeName || c.legalName }))}
          />
        </FormField>
        {type !== 'Documentos' && (
          <>
            <FormField label="Departamento" htmlFor="rep-dept">
              <Select
                id="rep-dept"
                placeholder="Todos"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                options={DEPARTMENTS}
              />
            </FormField>
            <FormField label="Responsável" htmlFor="rep-assignee">
              <Select
                id="rep-assignee"
                placeholder="Qualquer um"
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                options={(users.data ?? []).map((u) => ({ value: u.id, label: u.name }))}
              />
            </FormField>
            <FormField label="Status" htmlFor="rep-status">
              <Select
                id="rep-status"
                placeholder="Todos"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                options={STATUS[type]}
              />
            </FormField>
          </>
        )}
      </div>

      <ReportView
        table={preview.data}
        loading={preview.isLoading}
        onExport={(format) => reportsApi.export(type, filters, format)}
      />
    </main>
  )
}
