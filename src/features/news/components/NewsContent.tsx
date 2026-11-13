import { useMemo } from 'react'
import { Download, Paperclip } from 'lucide-react'
import { Button } from '@/components/ui'
import { formatBytes } from '@/lib/format'
import { toSafeHtml } from '@/lib/richText'
import type { NewsAttachment } from '@/types/domain'

interface Props {
  content: string
  imageUrl?: string | null
  attachments: NewsAttachment[]
  onDownload: (attachment: NewsAttachment) => void
  downloadingId?: string | null
}

/** Corpo da notícia: imagem de capa, conteúdo rico (HTML sanitizado; texto antigo vira parágrafos) e anexos. */
export function NewsContent({ content, imageUrl, attachments, onDownload, downloadingId }: Props) {
  const html = useMemo(() => toSafeHtml(content), [content])
  return (
    <div className="space-y-4">
      {imageUrl && <img src={imageUrl} alt="" className="max-h-64 w-full rounded-lg object-cover" />}
      {/* O HTML é sanitizado no backend e de novo aqui (DOMPurify) antes de ir para a página. */}
      <div className="rich-content" dangerouslySetInnerHTML={{ __html: html }} />
      {attachments.length > 0 && (
        <div className="space-y-2">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <Paperclip className="h-3.5 w-3.5" /> Anexos
          </p>
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
            {attachments.map((a) => (
              <li key={a.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                <span className="min-w-0 flex-1 truncate">{a.fileName}</span>
                <span className="text-xs text-slate-500">{formatBytes(a.sizeBytes)}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Baixar ${a.fileName}`}
                  loading={downloadingId === a.id}
                  onClick={() => onDownload(a)}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
