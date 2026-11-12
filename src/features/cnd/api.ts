import { api } from '@/lib/api'
import { mockDelay } from '@/lib/mock'
import { mockCnds } from '@/mocks/data'
import type { Cnd } from '@/types/domain'

/** Ainda não existe na API: usa dados simulados até o endpoint ser criado. */
const MOCK_ONLY = true

export const cndKeys = { list: (companyId: string) => ['cnd', companyId] as const }

export const cndApi = {
  async list(companyId: string): Promise<Cnd[]> {
    if (MOCK_ONLY) return mockDelay(companyId === 'c-1' ? mockCnds : [], 300)
    const { data } = await api.get<Cnd[]>(`/empresas/${companyId}/cnds`)
    return data
  },
}
