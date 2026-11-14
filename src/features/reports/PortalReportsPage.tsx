import { useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { FormField, Input, Select } from '@/components/ui'
import { useActiveCompany } from '@/features/companies/ActiveCompanyContext'
import { reportKeys, reportsApi, type ReportFilters } from './api'
import { ReportView } from './components/ReportView'
import { currentMonth } from './period'

const STATUS = [
  { value: 'Aberta', label: 'Aberta' },
  { value: 'EmAnalise', label: 'Em análise' },
  { value: 'AguardandoCliente', label: 'Aguardando você' },
  { value: 'Concluida', label: 'Concluída' },
  { value: 'Cancelada', label: 'Cancelada' },
]

/** Relatório de solicitações da empresa no portal do cliente (o layout do portal já garante a empresa ativa). */
export function PortalReportsPage() {
  const { company } = useActiveCompany()
  return company ? <CompanyReport key={company.id} companyId={company.id} /> : null
}

function CompanyReport({ companyId }: { companyId: string }) {
  const [range, setRange] = useState(currentMonth)
  const [status, setStatus] = useState('')
  const filters: ReportFilters = { ...range, status: status || undefined }
  const preview = useQuery({
    queryKey: reportKeys.company(companyId, filters),
    queryFn: () => reportsApi.companyPreview(companyId, filters),
    placeholderData: keepPreviousData,
    enabled: !!range.from && !!range.until,
  })

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-ink">Relatórios</h1>
        <p className="text-sm text-slate-500">Solicitações abertas pela empresa no período, com prazos e situação.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <FormField label="De" htmlFor="prep-from">
          <Input
            id="prep-from"
            type="date"
            value={range.from}
            onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
          />
        </FormField>
        <FormField label="Até" htmlFor="prep-until">
          <Input
            id="prep-until"
            type="date"
            value={range.until}
            onChange={(e) => setRange((r) => ({ ...r, until: e.target.value }))}
          />
        </FormField>
        <FormField label="Status" htmlFor="prep-status">
          <Select
            id="prep-status"
            placeholder="Todos"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            options={STATUS}
          />
        </FormField>
      </div>
      <ReportView
        table={preview.data}
        loading={preview.isLoading}
        onExport={(format) => reportsApi.companyExport(companyId, filters, format)}
      />
    </div>
  )
}
