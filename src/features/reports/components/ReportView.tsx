import { useState } from 'react'
import { FileSpreadsheet, FileText, TableProperties } from 'lucide-react'
import { Button, Card, EmptyState, Skeleton, Table, TBody, Td, Th, THead, Tr, useToast } from '@/components/ui'
import { getErrorMessage } from '@/lib/api'
import { saveFile } from '@/lib/download'
import { formatDateTime } from '@/lib/format'
import type { ReportFormat, ReportTable } from '../api'

interface Props {
  table?: ReportTable
  loading: boolean
  onExport: (format: Exclude<ReportFormat, 'Json'>) => Promise<{ blob: Blob; fileName: string }>
}

/** Prévia do relatório (resumo e primeiras linhas) com exportação em CSV e PDF. */
export function ReportView({ table, loading, onExport }: Props) {
  const toast = useToast()
  const [exporting, setExporting] = useState<'Csv' | 'Pdf' | null>(null)

  const download = async (format: 'Csv' | 'Pdf') => {
    setExporting(format)
    try {
      saveFile(await onExport(format))
    } catch (e) {
      toast.error(getErrorMessage(e, 'Não foi possível gerar o arquivo.'))
    } finally {
      setExporting(null)
    }
  }

  if (loading && !table) return <Skeleton className="h-80 rounded-xl" />
  if (!table) return null

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ink">{table.title}</h2>
          <p className="text-sm text-slate-500">
            {table.subtitle} · gerado em {formatDateTime(table.generatedAt)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => download('Csv')} loading={exporting === 'Csv'} disabled={table.total === 0}>
            <FileSpreadsheet className="h-4 w-4" /> CSV
          </Button>
          <Button variant="secondary" onClick={() => download('Pdf')} loading={exporting === 'Pdf'} disabled={table.total === 0}>
            <FileText className="h-4 w-4" /> PDF
          </Button>
        </div>
      </div>

      {table.summary.length > 0 && (
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {table.summary.map((s) => (
            <div key={s.label} className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{s.label}</dt>
              <dd className="mt-1 text-xl font-semibold tabular-nums text-ink">{s.value}</dd>
            </div>
          ))}
        </dl>
      )}

      <Card className="overflow-hidden">
        {table.rows.length === 0 ? (
          <div className="p-6">
            <EmptyState icon={<TableProperties className="h-8 w-8" />} title="Nada no período e filtros escolhidos." />
          </div>
        ) : (
          <>
            <Table>
              <THead>
                <tr>
                  {table.columns.map((c) => (
                    <Th key={c}>{c}</Th>
                  ))}
                </tr>
              </THead>
              <TBody>
                {table.rows.map((row, i) => (
                  <Tr key={i}>
                    {row.map((cell, j) => (
                      <Td key={j} className="whitespace-nowrap text-sm">
                        {cell}
                      </Td>
                    ))}
                  </Tr>
                ))}
              </TBody>
            </Table>
            {table.total > table.rows.length && (
              <p className="border-t border-slate-100 px-4 py-2 text-sm text-slate-500">
                Mostrando {table.rows.length} de {table.total} linhas. Exporte em CSV ou PDF para ver todas
                {table.truncated ? ' (até 20 mil)' : ''}.
              </p>
            )}
          </>
        )}
      </Card>
    </div>
  )
}
