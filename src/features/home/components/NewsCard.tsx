import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Megaphone, Paperclip } from 'lucide-react'
import { Card, CardBody, CardHeader, EmptyState, Skeleton, Tabs } from '@/components/ui'
import { newsApi, newsKeys } from '@/features/news/api'
import { formatDate } from '@/lib/format'
import { NewsReaderModal } from '@/features/news/components/NewsReaderModal'
import type { NewsItem } from '@/types/domain'

type Tab = 'unread' | 'read'

export function NewsCard({ companyId }: { companyId: string }) {
  const [tab, setTab] = useState<Tab>('unread')
  const [open, setOpen] = useState<NewsItem | null>(null)
  const queryClient = useQueryClient()
  const read = tab === 'read'

  const { data = [], isLoading } = useQuery({
    queryKey: newsKeys.list(companyId, read),
    queryFn: () => newsApi.list(companyId, read),
  })
  const { data: unread = [] } = useQuery({
    queryKey: newsKeys.list(companyId, false),
    queryFn: () => newsApi.list(companyId, false),
  })

  const markRead = useMutation({
    mutationFn: (id: string) => newsApi.markAsRead(companyId, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['news', companyId] }),
  })

  const openItem = (item: NewsItem) => {
    setOpen(item)
    if (!item.isRead) markRead.mutate(item.id)
  }

  // Link do aviso de nova notícia: /?noticia={id} abre a notícia direto.
  const [params, setParams] = useSearchParams()
  const linked = params.get('noticia')
  const { data: linkedItem, isError: linkedError } = useQuery({
    queryKey: newsKeys.detail(companyId, linked ?? ''),
    queryFn: () => newsApi.get(companyId, linked!),
    enabled: !!linked,
    retry: false,
  })
  useEffect(() => {
    if (!linked || (!linkedItem && !linkedError)) return
    if (linkedItem) openItem(linkedItem)
    setParams(
      (p) => {
        p.delete('noticia')
        return p
      },
      { replace: true },
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linked, linkedItem, linkedError])

  return (
    <Card>
      <CardHeader title="Notícias" icon={<Megaphone className="h-5 w-5" />} />
      <CardBody className="space-y-4">
        <Tabs
          items={[
            { value: 'unread', label: 'Não lidas', count: unread.length },
            { value: 'read', label: 'Lidas' },
          ]}
          value={tab}
          onChange={setTab}
        />
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-14" />
            <Skeleton className="h-14" />
          </div>
        ) : data.length === 0 ? (
          <EmptyState title={read ? 'Nenhuma notícia lida ainda' : 'Você já leu todas as notícias'} />
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => openItem(n)}
                  className="flex w-full items-start gap-3 py-3 text-left hover:bg-slate-50"
                >
                  {!n.isRead && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" aria-label="Não lida" />}
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-ink">{n.title}</span>
                    <span className="line-clamp-2 text-xs text-slate-500">{n.summary}</span>
                    <span className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                      {formatDate(n.publishedAt)}
                      {n.attachmentCount > 0 && (
                        <span className="inline-flex items-center gap-0.5" aria-label={`${n.attachmentCount} anexo(s)`}>
                          <Paperclip className="h-3 w-3" />
                          {n.attachmentCount}
                        </span>
                      )}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
      <NewsReaderModal companyId={companyId} item={open} onClose={() => setOpen(null)} />
    </Card>
  )
}
