import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, Circle } from 'lucide-react'
import { EmptyState, Modal, Skeleton } from '@/components/ui'
import { newsKeys, officeNewsApi } from '@/features/news/api'
import { formatDateTime } from '@/lib/format'
import type { OfficeNews } from '@/types/domain'

/** Quais empresas destinatárias já leram a notícia. */
export function NewsReachModal({ news, onClose }: { news: OfficeNews | null; onClose: () => void }) {
  const { data = [], isLoading } = useQuery({
    queryKey: newsKeys.reach(news?.id ?? ''),
    queryFn: () => officeNewsApi.reach(news!.id),
    enabled: !!news,
  })
  const sorted = [...data].sort((a, b) => Number(b.read) - Number(a.read) || a.companyName.localeCompare(b.companyName, 'pt-BR'))
  const read = data.filter((r) => r.read).length

  return (
    <Modal
      open={!!news}
      onClose={onClose}
      title="Alcance da notícia"
      description={news ? `${news.title} · lida em ${read} de ${data.length} empresa${data.length === 1 ? '' : 's'}` : ''}
    >
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-8" />
          <Skeleton className="h-8" />
        </div>
      ) : data.length === 0 ? (
        <EmptyState title="Nenhuma empresa recebe esta notícia" />
      ) : (
        <ul className="divide-y divide-slate-100">
          {sorted.map((r) => (
            <li key={r.companyId} className="flex items-center gap-3 py-2 text-sm">
              {r.read ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-label="Lida" />
              ) : (
                <Circle className="h-4 w-4 shrink-0 text-slate-300" aria-label="Não lida" />
              )}
              <span className="min-w-0 flex-1 truncate text-ink">{r.companyName}</span>
              <span className="text-xs text-slate-500">
                {r.read ? `${formatDateTime(r.firstReadAt)}${r.readers > 1 ? ` · ${r.readers} leitores` : ''}` : 'Não lida'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  )
}
