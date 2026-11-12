import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Download, FileText, Files } from 'lucide-react'
import { Button, Card, CardBody, CardHeader, EmptyState, Skeleton, Tabs } from '@/components/ui'
import { documentKeys, documentsApi } from '@/features/documents/api'
import { useDownloadDocuments } from '@/features/documents/hooks'
import { formatDate } from '@/lib/format'

type Tab = 'unread' | 'read'

export function RecentDocumentsCard({ companyId }: { companyId: string }) {
  const [tab, setTab] = useState<Tab>('unread')
  const read = tab === 'read'
  const download = useDownloadDocuments()

  const { data = [], isLoading } = useQuery({
    queryKey: documentKeys.recent(companyId, read),
    queryFn: () => documentsApi.recent(companyId, read),
  })
  const { data: unread = [] } = useQuery({
    queryKey: documentKeys.recent(companyId, false),
    queryFn: () => documentsApi.recent(companyId, false),
  })

  return (
    <Card>
      <CardHeader
        title="Documentos"
        icon={<Files className="h-5 w-5" />}
        action={
          <Link to="/documentos" className="text-sm font-medium text-brand-700 hover:underline">
            Ver todos
          </Link>
        }
      />
      <CardBody className="space-y-4">
        <Tabs
          items={[
            { value: 'unread', label: 'Não lidos', count: unread.length },
            { value: 'read', label: 'Lidos' },
          ]}
          value={tab}
          onChange={setTab}
        />
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
        ) : data.length === 0 ? (
          <EmptyState title={read ? 'Nenhum documento lido ainda' : 'Você já leu todos os documentos'} />
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.map((doc) => (
              <li key={doc.id} className="flex items-center gap-3 py-2.5">
                <FileText className="h-5 w-5 shrink-0 text-slate-400" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{doc.name}</p>
                  <p className="truncate text-xs text-slate-500">
                    {doc.folderPath} · {formatDate(doc.publishedAt)}
                  </p>
                </div>
                <Button variant="ghost" size="icon" aria-label={`Baixar ${doc.name}`} onClick={() => download.mutate([doc.id])}>
                  <Download className="h-4 w-4 text-brand-700" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  )
}
