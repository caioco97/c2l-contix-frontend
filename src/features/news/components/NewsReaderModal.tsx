import { useMutation, useQuery } from '@tanstack/react-query'
import { Modal, Skeleton, useToast } from '@/components/ui'
import { newsApi, newsKeys } from '@/features/news/api'
import { getErrorMessage } from '@/lib/api'
import { saveFile } from '@/lib/download'
import { formatDate } from '@/lib/format'
import { useBlobUrl } from '@/lib/useBlobUrl'
import type { NewsAttachment, NewsItem } from '@/types/domain'
import { NewsContent } from './NewsContent'

/** Leitura de uma notícia no portal. */
export function NewsReaderModal({ companyId, item, onClose }: { companyId: string; item: NewsItem | null; onClose: () => void }) {
  const toast = useToast()
  const { data, isLoading } = useQuery({
    queryKey: newsKeys.detail(companyId, item?.id ?? ''),
    queryFn: () => newsApi.get(companyId, item!.id),
    enabled: !!item,
  })
  const imageUrl = useBlobUrl(
    ['news', companyId, 'image', item?.id],
    () => newsApi.image(companyId, item!.id),
    !!item?.hasImage,
  )
  const download = useMutation({
    mutationFn: (a: NewsAttachment) => newsApi.downloadAttachment(companyId, item!.id, a.id, a.fileName),
    onSuccess: saveFile,
    onError: (e) => toast.error(getErrorMessage(e, 'Não foi possível baixar o anexo.')),
  })

  return (
    <Modal open={!!item} onClose={onClose} title={item?.title ?? ''} description={item ? formatDate(item.publishedAt) : ''} size="lg">
      {isLoading || !data ? (
        <div className="space-y-2">
          <Skeleton className="h-4" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ) : (
        <NewsContent
          content={data.content}
          imageUrl={imageUrl}
          attachments={data.attachments}
          onDownload={(a) => download.mutate(a)}
          downloadingId={download.isPending ? download.variables?.id : null}
        />
      )}
    </Modal>
  )
}
