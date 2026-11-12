import { api } from '@/lib/api'
import { env } from '@/config/env'
import { mockDelay } from '@/lib/mock'
import { mockCompanies } from '@/mocks/data'
import type { Company } from '@/types/domain'

export const companiesApi = {
  /** Empresas às quais o usuário logado tem acesso. */
  async listMine(): Promise<Company[]> {
    if (env.useMocks) return mockDelay(mockCompanies, 250)
    const { data } = await api.get<Company[]>('/me/companies')
    return data
  },
}
