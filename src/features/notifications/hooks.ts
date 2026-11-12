import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useActiveCompany } from '@/features/companies/ActiveCompanyContext'
import type { AppNotification } from '@/types/domain'
import { notificationKeys, notificationsApi } from './api'

/** Contador do sino; atualiza a cada minuto e ao voltar para a aba. */
export function useUnreadCount() {
  return useQuery({
    queryKey: notificationKeys.count,
    queryFn: notificationsApi.unreadCount,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  })
}

export function useNotifications(unreadOnly: boolean, page = 1, pageSize = 20, enabled = true) {
  return useQuery({
    queryKey: [...notificationKeys.list(unreadOnly, page), pageSize],
    queryFn: () => notificationsApi.list({ unreadOnly, page, pageSize }),
    placeholderData: keepPreviousData,
    enabled,
  })
}

export function useMarkAllRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
  })
}

/** Marca como lida, troca para a empresa do item (se preciso) e navega até ele. */
export function useOpenNotification() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { company, companies, setCompany } = useActiveCompany()

  return async (n: AppNotification) => {
    if (!n.isRead) {
      await notificationsApi.markRead(n.id).catch(() => undefined)
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all })
    }
    if (n.companyId && n.companyId !== company?.id && companies.some((c) => c.id === n.companyId)) {
      setCompany(n.companyId)
    }
    if (n.link) navigate(n.link)
  }
}
