import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Megaphone } from 'lucide-react'
import { Card, CardBody, CardHeader, EmptyState, Modal, Skeleton, Tabs } from '@/components/ui'
import { newsApi, newsKeys } from '@/features/news/api'
import { formatDate } from '@/lib/format'
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
                    <span className="mt-1 block text-xs text-slate-400">{formatDate(n.publishedAt)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
      <Modal open={!!open} onClose={() => setOpen(null)} title={open?.title ?? ''} description={open ? formatDate(open.publishedAt) : ''}>
        <p className="text-sm leading-relaxed text-slate-700">{open?.summary}</p>
      </Modal>
    </Card>
  )
}
