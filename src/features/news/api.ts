import { api } from '@/lib/api'
import { mockDelay } from '@/lib/mock'
import { mockStore } from '@/mocks/store'
import type { NewsItem } from '@/types/domain'

/** Ainda não existe na API: usa dados simulados até o endpoint ser criado. */
const MOCK_ONLY = true

export const newsKeys = {
  list: (companyId: string, read: boolean) => ['news', companyId, read] as const,
}

export const newsApi = {
  async list(companyId: string, read: boolean): Promise<NewsItem[]> {
    if (MOCK_ONLY) return mockDelay(mockStore.news(companyId).filter((n) => n.isRead === read), 250)
    const { data } = await api.get<NewsItem[]>(`/empresas/${companyId}/news`, { params: { read } })
    return data
  },
  async markAsRead(companyId: string, id: string): Promise<void> {
    if (MOCK_ONLY) {
      const item = mockStore.news(companyId).find((n) => n.id === id)
      if (item) item.isRead = true
      return mockDelay(undefined, 150)
    }
    await api.post(`/news/${id}/read`)
  },
}
