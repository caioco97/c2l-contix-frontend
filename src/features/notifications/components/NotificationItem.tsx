import { formatDistanceToNow, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarClock, FileText, MessageSquare, Inbox } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { AppNotification, NotificationType } from '@/types/domain'

const ICONS: Record<NotificationType, typeof FileText> = {
  NewDocument: FileText,
  DueSoon: CalendarClock,
  NewRequest: Inbox,
  RequestUpdated: MessageSquare,
}

const TONES: Record<NotificationType, string> = {
  NewDocument: 'bg-brand-50 text-brand-600',
  DueSoon: 'bg-amber-50 text-amber-600',
  NewRequest: 'bg-emerald-50 text-emerald-600',
  RequestUpdated: 'bg-violet-50 text-violet-600',
}

function timeAgo(iso: string) {
  return formatDistanceToNow(parseISO(iso), { addSuffix: true, locale: ptBR })
}

interface NotificationItemProps {
  notification: AppNotification
  onOpen: (n: AppNotification) => void
  compact?: boolean
}

export function NotificationItem({ notification: n, onOpen, compact }: NotificationItemProps) {
  const Icon = ICONS[n.type]
  return (
    <button
      type="button"
      onClick={() => onOpen(n)}
      className={cn(
        'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50',
        !n.isRead && 'bg-brand-50/40',
      )}
    >
      <span className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full', TONES[n.type])}>
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn('block text-sm text-ink', !n.isRead && 'font-semibold')}>{n.title}</span>
        <span className={cn('mt-0.5 block text-sm text-slate-600', compact && 'line-clamp-2')}>{n.message}</span>
        <span className="mt-1 block text-xs text-slate-400">{timeAgo(n.createdAt)}</span>
      </span>
      {!n.isRead && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand-600" aria-label="Não lida" />}
    </button>
  )
}
