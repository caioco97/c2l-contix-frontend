import { api } from '@/lib/api'
import { env } from '@/config/env'
import { mockDelay } from '@/lib/mock'
import { mockStore } from '@/mocks/store'
import type { NewsItem } from '@/types/domain'

export const newsKeys = {
  list: (companyId: string, read: boolean) => ['news', companyId, read] as const,
}

export const newsApi = {
  async list(companyId: string, read: boolean): Promise<NewsItem[]> {
    if (env.useMocks) return mockDelay(mockStore.news(companyId).filter((n) => n.isRead === read), 250)
    const { data } = await api.get<NewsItem[]>(`/companies/${companyId}/news`, { params: { read } })
    return data
  },
  async markAsRead(companyId: string, id: string): Promise<void> {
    if (env.useMocks) {
      const item = mockStore.news(companyId).find((n) => n.id === id)
      if (item) item.isRead = true
      return mockDelay(undefined, 150)
    }
    await api.post(`/news/${id}/read`)
  },
}
