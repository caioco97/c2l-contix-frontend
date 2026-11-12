import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, CheckCheck, Mail } from 'lucide-react'
import { Button, Card, CardBody, CardHeader, Checkbox, EmptyState, Spinner, Tabs, useToast } from '@/components/ui'
import { getErrorMessage } from '@/lib/api'
import { notificationKeys, notificationsApi } from './api'
import { NotificationItem } from './components/NotificationItem'
import { useMarkAllRead, useNotifications, useOpenNotification, useUnreadCount } from './hooks'

type Filter = 'all' | 'unread'
const PAGE_SIZE = 20

export function NotificationsPage() {
  const [filter, setFilter] = useState<Filter>('all')
  const [page, setPage] = useState(1)
  const { data: unread = 0 } = useUnreadCount()
  const { data, isLoading, isFetching } = useNotifications(filter === 'unread', page, PAGE_SIZE)
  const markAll = useMarkAllRead()
  const open = useOpenNotification()
  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1

  return (
    <main className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-3 [&>*]:min-w-0">
      <Card className="lg:col-span-2">
        <CardHeader
          title="Notificações"
          icon={<Bell className="h-5 w-5" />}
          action={
            unread > 0 && (
              <Button variant="secondary" size="sm" onClick={() => markAll.mutate()} loading={markAll.isPending}>
                <CheckCheck className="h-4 w-4" />
                Marcar todas como lidas
              </Button>
            )
          }
        />
        <CardBody className="pb-2">
          <Tabs
            items={[
              { value: 'all', label: 'Todas' },
              { value: 'unread', label: 'Não lidas', count: unread },
            ]}
            value={filter}
            onChange={(v) => {
              setFilter(v)
              setPage(1)
            }}
          />
        </CardBody>
        {isLoading ? (
          <Spinner className="py-12" />
        ) : !data?.items.length ? (
          <div className="px-5 pb-5">
            <EmptyState
              icon={<Bell className="h-6 w-6" />}
              title={filter === 'unread' ? 'Nenhuma notificação não lida' : 'Você não possui notificações'}
              description="Avisaremos aqui sobre novos documentos, vencimentos e solicitações."
            />
          </div>
        ) : (
          <>
            <div className={`divide-y divide-slate-100 border-y border-slate-100 ${isFetching ? 'opacity-60' : ''}`}>
              {data.items.map((n) => (
                <NotificationItem key={n.id} notification={n} onOpen={(item) => void open(item)} />
              ))}
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 text-sm text-slate-600">
                <span>
                  Página {page} de {totalPages}
                </span>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                    Anterior
                  </Button>
                  <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                    Próxima
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      <PreferencesCard />
    </main>
  )
}

function PreferencesCard() {
  const queryClient = useQueryClient()
  const toast = useToast()
  const { data: prefs, isLoading } = useQuery({ queryKey: notificationKeys.preferences, queryFn: notificationsApi.preferences })
  const save = useMutation({
    mutationFn: notificationsApi.updatePreferences,
    onSuccess: (data) => {
      queryClient.setQueryData(notificationKeys.preferences, data)
      toast.success('Preferências salvas.')
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  return (
    <Card className="h-fit">
      <CardHeader title="E-mails" icon={<Mail className="h-5 w-5" />} />
      <CardBody>
        <p className="mb-4 text-sm text-slate-600">
          Escolha quais avisos também chegam por e-mail. As notificações na plataforma continuam aparecendo.
        </p>
        {isLoading || !prefs ? (
          <Spinner />
        ) : (
          <ul className="space-y-3">
            {prefs.map((p) => (
              <li key={p.type}>
                <label className="flex cursor-pointer items-center justify-between gap-3 text-sm text-ink">
                  {p.label}
                  <Checkbox
                    checked={p.email}
                    disabled={save.isPending}
                    onChange={(e) => save.mutate([{ type: p.type, email: e.target.checked }])}
                    aria-label={`Receber e-mail: ${p.label}`}
                  />
                </label>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  )
}
