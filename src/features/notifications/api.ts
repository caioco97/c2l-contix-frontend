import { api } from '@/lib/api'
import { env } from '@/config/env'
import { mockDelay } from '@/lib/mock'
import type { PagedResult } from '@/types/api'
import type { AppNotification, NotificationPreference, NotificationType } from '@/types/domain'
import type { NotificacaoDto, PagedDto, PreferenciaNotificacaoDto, TipoNotificacaoDto } from '@/types/dto'

/* ---------- Conversão DTO (API) <-> domínio ---------- */

const TYPE_FROM_API: Record<TipoNotificacaoDto, NotificationType> = {
  NovoDocumento: 'NewDocument',
  VencimentoProximo: 'DueSoon',
  NovaSolicitacao: 'NewRequest',
  SolicitacaoAtualizada: 'RequestUpdated',
}
const TYPE_TO_API = Object.fromEntries(Object.entries(TYPE_FROM_API).map(([k, v]) => [v, k])) as Record<
  NotificationType,
  TipoNotificacaoDto
>

function toNotification(dto: NotificacaoDto): AppNotification {
  return {
    id: dto.id,
    type: TYPE_FROM_API[dto.tipo],
    title: dto.titulo,
    message: dto.mensagem,
    link: dto.link,
    companyId: dto.empresaId,
    isRead: dto.lida,
    createdAt: dto.criadaEm,
  }
}

function toPreference(dto: PreferenciaNotificacaoDto): NotificationPreference {
  return { type: TYPE_FROM_API[dto.tipo], label: dto.descricao, email: dto.receberEmail }
}

export const notificationKeys = {
  all: ['notifications'] as const,
  list: (unreadOnly: boolean, page: number) => ['notifications', 'list', { unreadOnly, page }] as const,
  count: ['notifications', 'count'] as const,
  preferences: ['notifications', 'preferences'] as const,
}

/* ---------- Mocks (VITE_USE_MOCKS=true) ---------- */

const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString()
let mockNotifications: AppNotification[] = [
  {
    id: 'n1',
    type: 'NewDocument',
    title: 'Novo documento: DAS Novembro',
    message: 'Foi publicado o documento "DAS Novembro" na pasta Fiscal.',
    link: '/documentos',
    companyId: null,
    isRead: false,
    createdAt: ago(12),
  },
  {
    id: 'n2',
    type: 'DueSoon',
    title: 'Vencimento próximo: FGTS',
    message: 'O documento "FGTS" vence em 2 dias.',
    link: '/documentos',
    companyId: null,
    isRead: false,
    createdAt: ago(180),
  },
  {
    id: 'n3',
    type: 'RequestUpdated',
    title: 'Solicitação #12: Em análise',
    message: 'A solicitação "Cálculo de férias" passou de Aberta para Em análise.',
    link: '/portal/solicitacoes',
    companyId: null,
    isRead: true,
    createdAt: ago(60 * 26),
  },
]
let mockPreferences: NotificationPreference[] = [
  { type: 'NewDocument', label: 'Novos documentos', email: true },
  { type: 'DueSoon', label: 'Vencimentos próximos', email: true },
  { type: 'NewRequest', label: 'Novas solicitações', email: true },
  { type: 'RequestUpdated', label: 'Atualizações de solicitações', email: true },
]

/* ---------- API ---------- */

export const notificationsApi = {
  async list(params: { unreadOnly?: boolean; page?: number; pageSize?: number }): Promise<PagedResult<AppNotification>> {
    const page = params.page ?? 1
    const pageSize = params.pageSize ?? 20
    if (env.useMocks) {
      const items = mockNotifications.filter((n) => !params.unreadOnly || !n.isRead)
      return mockDelay({ items: items.slice((page - 1) * pageSize, page * pageSize), page, pageSize, total: items.length })
    }
    const { data } = await api.get<PagedDto<NotificacaoDto>>('/notificacoes', {
      params: { somenteNaoLidas: params.unreadOnly || undefined, page, pageSize },
    })
    return { ...data, items: data.items.map(toNotification) }
  },

  async unreadCount(): Promise<number> {
    if (env.useMocks) return mockDelay(mockNotifications.filter((n) => !n.isRead).length, 150)
    const { data } = await api.get<{ naoLidas: number }>('/notificacoes/contador')
    return data.naoLidas
  },

  async markRead(id: string): Promise<void> {
    if (env.useMocks) {
      mockNotifications = mockNotifications.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      return mockDelay(undefined, 100)
    }
    await api.post(`/notificacoes/${id}/lida`)
  },

  async markAllRead(): Promise<void> {
    if (env.useMocks) {
      mockNotifications = mockNotifications.map((n) => ({ ...n, isRead: true }))
      return mockDelay(undefined, 150)
    }
    await api.post('/notificacoes/lidas')
  },

  async preferences(): Promise<NotificationPreference[]> {
    if (env.useMocks) return mockDelay(mockPreferences)
    const { data } = await api.get<PreferenciaNotificacaoDto[]>('/notificacoes/preferencias')
    return data.map(toPreference)
  },

  async updatePreferences(prefs: Pick<NotificationPreference, 'type' | 'email'>[]): Promise<NotificationPreference[]> {
    if (env.useMocks) {
      mockPreferences = mockPreferences.map((p) => ({ ...p, email: prefs.find((x) => x.type === p.type)?.email ?? p.email }))
      return mockDelay(mockPreferences)
    }
    const { data } = await api.put<PreferenciaNotificacaoDto[]>('/notificacoes/preferencias', {
      preferencias: prefs.map((p) => ({ tipo: TYPE_TO_API[p.type], receberEmail: p.email })),
    })
    return data.map(toPreference)
  },
}
