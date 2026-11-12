import { Bell, CheckCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button, DropdownMenu, Spinner } from '@/components/ui'
import { useMarkAllRead, useNotifications, useOpenNotification, useUnreadCount } from '../hooks'
import { NotificationItem } from './NotificationItem'

/** Sino do cabeçalho: contador de não lidas e as notificações mais recentes. */
export function NotificationBell() {
  const { data: unread = 0 } = useUnreadCount()

  return (
    <DropdownMenu
      className="w-[min(24rem,calc(100vw-2rem))] py-0"
      trigger={({ toggle, open }) => (
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          onClick={toggle}
          aria-expanded={open}
          aria-haspopup="menu"
          aria-label={unread > 0 ? `Notificações (${unread} não lidas)` : 'Notificações'}
        >
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold leading-none text-white">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </Button>
      )}
    >
      {(close) => <BellPanel close={close} unread={unread} />}
    </DropdownMenu>
  )
}

function BellPanel({ close, unread }: { close: () => void; unread: number }) {
  const { data, isLoading } = useNotifications(false, 1, 8)
  const markAll = useMarkAllRead()
  const open = useOpenNotification()

  return (
    <div>
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <p className="text-sm font-semibold text-ink">Notificações</p>
        {unread > 0 && (
          <button
            type="button"
            onClick={() => markAll.mutate()}
            disabled={markAll.isPending}
            className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline disabled:opacity-50"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Marcar todas como lidas
          </button>
        )}
      </div>
      <div className="max-h-96 divide-y divide-slate-100 overflow-y-auto">
        {isLoading ? (
          <Spinner className="py-8" />
        ) : !data?.items.length ? (
          <p className="px-4 py-8 text-center text-sm text-slate-500">Você não possui notificações.</p>
        ) : (
          data.items.map((n) => (
            <NotificationItem
              key={n.id}
              notification={n}
              compact
              onOpen={(item) => {
                close()
                void open(item)
              }}
            />
          ))
        )}
      </div>
      <Link
        to="/notificacoes"
        onClick={close}
        className="block border-t border-slate-100 px-4 py-2.5 text-center text-sm font-medium text-brand-700 hover:bg-slate-50"
      >
        Ver todas e preferências
      </Link>
    </div>
  )
}
