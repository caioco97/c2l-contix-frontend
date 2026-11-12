import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, isSameDay, parseISO, startOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarDays, Download, FileText } from 'lucide-react'
import { Button, Calendar, Card, CardBody, CardHeader, EmptyState, Skeleton } from '@/components/ui'
import { documentKeys, documentsApi } from '@/features/documents/api'
import { useDownloadDocuments } from '@/features/documents/hooks'

export function DueCalendarCard({ companyId }: { companyId: string }) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const [selected, setSelected] = useState<Date | null>(() => new Date())
  const monthKey = format(month, 'yyyy-MM')
  const download = useDownloadDocuments()

  const { data = [], isLoading } = useQuery({
    queryKey: documentKeys.due(companyId, monthKey),
    queryFn: () => documentsApi.dueInMonth(companyId, monthKey),
  })

  const markedDays = useMemo(() => data.map((d) => parseISO(d.dueDate!)), [data])
  const dayDocs = selected ? data.filter((d) => isSameDay(parseISO(d.dueDate!), selected)) : []

  return (
    <Card>
      <CardHeader title="Calendário de Vencimentos" icon={<CalendarDays className="h-5 w-5" />} />
      <CardBody className="space-y-4">
        <Calendar
          month={month}
          onMonthChange={(m) => {
            setMonth(m)
            setSelected(null)
          }}
          selected={selected}
          onSelect={setSelected}
          markedDays={markedDays}
        />

        <div className="border-t border-slate-100 pt-4">
          {selected && (
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
              {format(selected, "EEEE, d 'de' MMMM", { locale: ptBR })}
            </p>
          )}
          {isLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : !selected ? (
            <p className="text-sm text-slate-500">
              {data.length
                ? `${data.length} vencimento(s) neste mês. Selecione um dia marcado.`
                : 'Nenhum vencimento neste mês.'}
            </p>
          ) : dayDocs.length === 0 ? (
            <EmptyState title="Você não possui documentos para esta data" className="py-5" />
          ) : (
            <ul className="space-y-2">
              {dayDocs.map((doc) => (
                <li key={doc.id} className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
                  <FileText className="h-5 w-5 shrink-0 text-brand-600" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{doc.name}</p>
                    <p className="truncate text-xs text-slate-500">{doc.folderPath}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Baixar ${doc.name}`}
                    onClick={() => download.mutate([doc.id])}
                  >
                    <Download className="h-4 w-4 text-brand-700" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardBody>
    </Card>
  )
}
