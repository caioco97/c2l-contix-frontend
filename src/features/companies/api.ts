import { api } from '@/lib/api'
import { env } from '@/config/env'
import { mockDelay } from '@/lib/mock'
import { mockCompanies } from '@/mocks/data'
import type { Company } from '@/types/domain'
import type { EmpresaDto, PagedDto } from '@/types/dto'

function toCompany(dto: EmpresaDto): Company {
  return {
    id: dto.id,
    legalName: dto.razaoSocial,
    tradeName: dto.nomeFantasia || dto.razaoSocial,
    nickname: dto.apelido ?? '',
    document: dto.documento,
  }
}

export const companiesApi = {
  /** Empresas às quais o usuário logado tem acesso (Cliente recebe só as vinculadas). */
  async listMine(): Promise<Company[]> {
    if (env.useMocks) return mockDelay(mockCompanies, 250)
    const { data } = await api.get<PagedDto<EmpresaDto>>('/empresas', { params: { page: 1, pageSize: 100 } })
    return data.items.map(toCompany)
  },
}
