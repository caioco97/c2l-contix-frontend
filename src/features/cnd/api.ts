import { api } from '@/lib/api'
import { env } from '@/config/env'
import { mockDelay } from '@/lib/mock'
import { mockCnds } from '@/mocks/data'
import type { Cnd } from '@/types/domain'

export const cndKeys = { list: (companyId: string) => ['cnd', companyId] as const }

export const cndApi = {
  async list(companyId: string): Promise<Cnd[]> {
    if (env.useMocks) return mockDelay(companyId === 'c-1' ? mockCnds : [], 300)
    const { data } = await api.get<Cnd[]>(`/companies/${companyId}/cnds`)
    return data
  },
}
