import { api } from '@/lib/api'
import { env } from '@/config/env'
import { mockDelay, mockError } from '@/lib/mock'
import { mockCompanies } from '@/mocks/data'
import { mockStore } from '@/mocks/store'
import type { PagedResult } from '@/types/api'
import type {
  Address,
  Company,
  CompanyBranding,
  CompanyDetail,
  CompanyHistoryItem,
  CompanyInput,
  CompanyPanel,
  CompanyStatus,
  CompanySummary,
  HistoryCategory,
  PortalPermissions,
  PortalUser,
  TaxRegime,
} from '@/types/domain'
import type {
  EmpresaDetalheDto,
  EmpresaDto,
  EnderecoDto,
  HistoricoEmpresaDto,
  IdentidadeVisualDto,
  ItemHistoricoEmpresaDto,
  PagedDto,
  PainelEmpresaDto,
  UsuarioPortalDto,
} from '@/types/dto'

/* ---------- Conversão DTO (API) <-> domínio ---------- */

const NO_BRANDING: CompanyBranding = { primaryColor: null, secondaryColor: null, hasLogo: false, logoVersion: null }

const toBranding = (d: IdentidadeVisualDto | null | undefined): CompanyBranding =>
  d
    ? { primaryColor: d.corPrimaria, secondaryColor: d.corSecundaria, hasLogo: d.possuiLogo, logoVersion: d.logoVersao }
    : NO_BRANDING

function toCompany(dto: EmpresaDto): Company {
  return {
    id: dto.id,
    legalName: dto.razaoSocial,
    tradeName: dto.nomeFantasia || dto.razaoSocial,
    nickname: dto.apelido ?? '',
    document: dto.documento,
    modules: dto.modulos ?? null,
    branding: toBranding(dto.identidadeVisual),
  }
}

function toSummary(dto: EmpresaDto): CompanySummary {
  return {
    id: dto.id,
    legalName: dto.razaoSocial,
    tradeName: dto.nomeFantasia,
    nickname: dto.apelido,
    document: dto.documento,
    taxRegime: (dto.regimeTributario ?? 'Outro') as TaxRegime,
    status: (dto.situacao ?? 'Ativa') as CompanyStatus,
  }
}

const toAddress = (e: EnderecoDto | null): Address | null =>
  e && {
    zip: e.cep ?? '',
    street: e.logradouro ?? '',
    number: e.numero ?? '',
    complement: e.complemento ?? '',
    district: e.bairro ?? '',
    city: e.cidade ?? '',
    state: e.uf ?? '',
  }

function toDetail(dto: EmpresaDetalheDto): CompanyDetail {
  return {
    id: dto.id,
    legalName: dto.razaoSocial,
    tradeName: dto.nomeFantasia,
    nickname: dto.apelido,
    document: dto.documento,
    taxRegime: dto.regimeTributario,
    status: dto.situacao,
    stateRegistration: dto.inscricaoEstadual,
    cityRegistration: dto.inscricaoMunicipal,
    email: dto.email,
    phone: dto.telefone,
    address: toAddress(dto.endereco),
    createdAt: dto.createdAt,
    branding: toBranding(dto.identidadeVisual),
  }
}

const blank = (v: string | null | undefined) => (v && v.trim() ? v.trim() : null)

function toRequest(input: CompanyInput) {
  const a = input.address
  const hasAddress = !!a && Object.values(a).some((v) => v.trim())
  return {
    razaoSocial: input.legalName.trim(),
    nomeFantasia: blank(input.tradeName),
    apelido: blank(input.nickname),
    documento: input.document.replace(/\D/g, ''),
    inscricaoEstadual: blank(input.stateRegistration),
    inscricaoMunicipal: blank(input.cityRegistration),
    regimeTributario: input.taxRegime,
    situacao: input.status,
    email: blank(input.email),
    telefone: blank(input.phone),
    endereco: hasAddress
      ? {
          cep: blank(a!.zip),
          logradouro: blank(a!.street),
          numero: blank(a!.number),
          complemento: blank(a!.complement),
          bairro: blank(a!.district),
          cidade: blank(a!.city),
          uf: blank(a!.state)?.toUpperCase() ?? null,
        }
      : null,
  }
}

const toPanel = (d: PainelEmpresaDto): CompanyPanel => ({
  activeUsers: d.usuariosAtivos,
  pendingInvites: d.convitesPendentes,
  documentsNotSeenByClient: d.documentosNaoVistosPeloCliente,
  receivedUnread: d.documentosRecebidosNaoLidos,
  openRequests: d.solicitacoesEmAberto,
  overdueRequests: d.solicitacoesAtrasadas,
  expiredCnds: d.certidoesVencidas,
  expiringCnds: d.certidoesAVencer,
  openTasks: d.tarefasEmAberto,
  overdueTasks: d.tarefasAtrasadas,
})

const toHistoryItem = (d: ItemHistoricoEmpresaDto): CompanyHistoryItem => ({
  id: d.id,
  category: d.categoria,
  type: d.tipo,
  at: d.ocorridoEm,
  userName: d.usuarioNome,
  isOffice: d.ehDoEscritorio,
  title: d.titulo,
  detail: d.detalhe,
  referenceId: d.referenciaId,
  folderId: d.pastaId,
})

const toPortalUser = (d: UsuarioPortalDto): PortalUser => ({
  id: d.id,
  name: d.nome,
  email: d.email,
  active: d.ativo,
  invitePending: d.convitePendente,
  invitedAt: d.conviteEnviadoEm,
  lastLoginAt: d.ultimoLoginEm,
  linkedAt: d.vinculadoEm,
  modules: d.modulos,
  allFolders: d.todasAsPastas,
  folderIds: d.pastaIds,
  otherCompanies: d.outrasEmpresas,
})

const toPermissionsRequest = (p: PortalPermissions) => ({
  modulos: p.modules,
  todasAsPastas: p.allFolders,
  pastaIds: p.allFolders ? [] : p.folderIds,
})

/* ---------- Mocks (VITE_USE_MOCKS=true) ---------- */

const now = () => new Date().toISOString()
const mockDetails = new Map<string, CompanyDetail>(
  mockCompanies.map((c, i) => [
    c.id,
    {
      id: c.id,
      legalName: c.legalName,
      tradeName: c.tradeName,
      nickname: c.nickname,
      document: c.document,
      taxRegime: i === 0 ? 'SimplesNacional' : 'LucroPresumido',
      status: 'Ativa',
      stateRegistration: null,
      cityRegistration: null,
      email: null,
      phone: null,
      address: null,
      createdAt: now(),
      branding: NO_BRANDING,
    },
  ]),
)
const mockLogos = new Map<string, Blob>()
const mockUsers = new Map<string, PortalUser[]>([
  [
    'c-1',
    [
      {
        id: 'u-cli-1',
        name: 'Cliente Demo',
        email: 'cliente@contix.dev',
        active: true,
        invitePending: false,
        invitedAt: null,
        lastLoginAt: now(),
        linkedAt: now(),
        modules: ['Documentos', 'Solicitacoes', 'NFe'],
        allFolders: true,
        folderIds: [],
        otherCompanies: 1,
      },
    ],
  ],
])
const usersOf = (companyId: string) => {
  if (!mockUsers.has(companyId)) mockUsers.set(companyId, [])
  return mockUsers.get(companyId)!
}

/* ---------- API ---------- */

export interface CompanyFilters {
  search?: string
  taxRegime?: TaxRegime
  status?: CompanyStatus
  page: number
  pageSize: number
}

export const companyKeys = {
  all: ['companies'] as const,
  list: (f: CompanyFilters) => ['companies', 'list', f] as const,
  detail: (id: string) => ['companies', 'detail', id] as const,
  panel: (id: string) => ['companies', 'panel', id] as const,
  history: (id: string, category?: HistoryCategory) => ['companies', 'history', id, category ?? 'all'] as const,
  users: (id: string) => ['companies', 'users', id] as const,
  logo: (id: string, version: string | null) => ['companies', 'logo', id, version] as const,
}

export const companiesApi = {
  /** Empresas às quais o usuário logado tem acesso (Cliente recebe só as vinculadas, com os módulos liberados). */
  async listMine(): Promise<Company[]> {
    if (env.useMocks)
      return mockDelay(
        mockCompanies.map((c) => ({ ...c, branding: mockDetails.get(c.id)?.branding ?? NO_BRANDING })),
        250,
      )
    const { data } = await api.get<PagedDto<EmpresaDto>>('/empresas', { params: { page: 1, pageSize: 100 } })
    return data.items.map(toCompany)
  },

  async search(f: CompanyFilters): Promise<PagedResult<CompanySummary>> {
    if (env.useMocks) {
      const term = f.search?.toLowerCase() ?? ''
      const items = [...mockDetails.values()].filter(
        (c) =>
          (!term || [c.legalName, c.tradeName, c.nickname, c.document].some((v) => v?.toLowerCase().includes(term))) &&
          (!f.taxRegime || c.taxRegime === f.taxRegime) &&
          (!f.status || c.status === f.status),
      )
      return mockDelay({ items, page: 1, pageSize: f.pageSize, total: items.length, totalPages: 1 })
    }
    const { data } = await api.get<PagedDto<EmpresaDto>>('/empresas', {
      params: {
        busca: f.search || undefined,
        regime: f.taxRegime,
        situacao: f.status,
        page: f.page,
        pageSize: f.pageSize,
        orderBy: 'razaoSocial',
      },
    })
    return { ...data, items: data.items.map(toSummary) }
  },

  async get(id: string): Promise<CompanyDetail> {
    if (env.useMocks) {
      const c = mockDetails.get(id)
      return c ? mockDelay(c) : mockError(404, 'Empresa não encontrada.')
    }
    const { data } = await api.get<EmpresaDetalheDto>(`/empresas/${id}`)
    return toDetail(data)
  },

  async create(input: CompanyInput): Promise<CompanyDetail> {
    if (env.useMocks) {
      const c: CompanyDetail = { ...input, id: crypto.randomUUID(), createdAt: now(), branding: NO_BRANDING }
      mockDetails.set(c.id, c)
      return mockDelay(c)
    }
    const { data } = await api.post<EmpresaDetalheDto>('/empresas', toRequest(input))
    return toDetail(data)
  },

  async update(id: string, input: CompanyInput): Promise<CompanyDetail> {
    if (env.useMocks) {
      const c = { ...mockDetails.get(id)!, ...input }
      mockDetails.set(id, c)
      return mockDelay(c)
    }
    const { data } = await api.put<EmpresaDetalheDto>(`/empresas/${id}`, toRequest(input))
    return toDetail(data)
  },

  /* ---------- Identidade visual (portal do cliente) ---------- */

  async saveColors(
    id: string,
    colors: { primaryColor: string | null; secondaryColor: string | null },
  ): Promise<CompanyBranding> {
    if (env.useMocks) {
      const c = mockDetails.get(id)!
      c.branding = { ...c.branding, ...colors }
      return mockDelay(c.branding)
    }
    const { data } = await api.put<IdentidadeVisualDto>(`/empresas/${id}/identidade-visual`, {
      corPrimaria: colors.primaryColor,
      corSecundaria: colors.secondaryColor,
    })
    return toBranding(data)
  },

  /** Envia ou troca o logotipo (PNG, JPG ou WEBP de até 1 MB). */
  async uploadLogo(id: string, file: File): Promise<CompanyBranding> {
    if (env.useMocks) {
      const c = mockDetails.get(id)!
      mockLogos.set(id, file)
      c.branding = { ...c.branding, hasLogo: true, logoVersion: String(Date.now()) }
      return mockDelay(c.branding)
    }
    const form = new FormData()
    form.append('arquivo', file)
    // O cliente HTTP manda JSON por padrão: sem este cabeçalho o axios converte o FormData em JSON e a API responde 415.
    const { data } = await api.put<IdentidadeVisualDto>(`/empresas/${id}/identidade-visual/logo`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return toBranding(data)
  },

  async removeLogo(id: string): Promise<CompanyBranding> {
    if (env.useMocks) {
      const c = mockDetails.get(id)!
      mockLogos.delete(id)
      c.branding = { ...c.branding, hasLogo: false, logoVersion: null }
      return mockDelay(c.branding)
    }
    const { data } = await api.delete<IdentidadeVisualDto>(`/empresas/${id}/identidade-visual/logo`)
    return toBranding(data)
  },

  /** Logotipo da empresa (exige o token, por isso vem como blob). */
  async logo(id: string): Promise<Blob> {
    if (env.useMocks) {
      const blob = mockLogos.get(id)
      return blob ? mockDelay(blob, 100) : mockError(404, 'Logotipo não encontrado.')
    }
    const { data } = await api.get<Blob>(`/empresas/${id}/identidade-visual/logo`, { responseType: 'blob' })
    return data
  },

  /** Exclusão lógica (somente administrador). */
  async remove(id: string): Promise<void> {
    if (env.useMocks) {
      if (!mockDetails.delete(id)) return mockError(404, 'Empresa não encontrada.')
      mockUsers.delete(id)
      return mockDelay(undefined)
    }
    await api.delete(`/empresas/${id}`)
  },

  async panel(id: string): Promise<CompanyPanel> {
    if (env.useMocks) {
      const users = usersOf(id)
      return mockDelay({
        activeUsers: users.filter((u) => u.active).length,
        pendingInvites: users.filter((u) => u.active && u.invitePending).length,
        documentsNotSeenByClient: 2,
        receivedUnread: 1,
        openRequests: 3,
        overdueRequests: 1,
        expiredCnds: 0,
        expiringCnds: 1,
        openTasks: mockStore.tasks(id).filter((t) => !['Done', 'Canceled'].includes(t.status)).length,
        overdueTasks: mockStore.tasks(id).filter((t) => t.isOverdue).length,
      })
    }
    const { data } = await api.get<PainelEmpresaDto>(`/empresas/${id}/painel`)
    return toPanel(data)
  },

  async history(
    id: string,
    { before, category, limit = 30 }: { before?: string | null; category?: HistoryCategory; limit?: number },
  ): Promise<{ items: CompanyHistoryItem[]; next: string | null }> {
    if (env.useMocks) {
      const items: CompanyHistoryItem[] = before
        ? []
        : [
            {
              id: 'h1',
              category: 'Documento',
              type: 'Upload',
              at: now(),
              userName: 'Colaborador Demo',
              isOffice: true,
              title: 'Documento publicado: DAS Novembro',
              detail: 'Pasta Fiscal',
              referenceId: null,
              folderId: 'f-fis',
            },
            {
              id: 'h2',
              category: 'Usuario',
              type: 'Vinculo',
              at: new Date(Date.now() - 86_400_000).toISOString(),
              userName: null,
              isOffice: true,
              title: 'Acesso ao portal liberado para Cliente Demo',
              detail: 'cliente@contix.dev',
              referenceId: 'u-cli-1',
              folderId: null,
            },
          ]
      return mockDelay({ items: items.filter((i) => !category || i.category === category), next: null })
    }
    const { data } = await api.get<HistoricoEmpresaDto>(`/empresas/${id}/historico`, {
      params: { antesDe: before || undefined, categoria: category, limite: limit },
    })
    return { items: data.itens.map(toHistoryItem), next: data.proximoAntesDe }
  },

  /* ---------- Usuários do portal ---------- */

  async users(companyId: string): Promise<PortalUser[]> {
    if (env.useMocks) return mockDelay(usersOf(companyId))
    const { data } = await api.get<UsuarioPortalDto[]>(`/empresas/${companyId}/usuarios`)
    return data.map(toPortalUser)
  },

  async invite(companyId: string, input: { name: string; email: string } & PortalPermissions): Promise<PortalUser> {
    if (env.useMocks) {
      const u: PortalUser = {
        id: crypto.randomUUID(),
        name: input.name,
        email: input.email.toLowerCase(),
        active: true,
        invitePending: true,
        invitedAt: now(),
        lastLoginAt: null,
        linkedAt: now(),
        modules: input.modules,
        allFolders: input.allFolders,
        folderIds: input.folderIds,
        otherCompanies: 0,
      }
      usersOf(companyId).push(u)
      return mockDelay(u)
    }
    const { data } = await api.post<UsuarioPortalDto>(`/empresas/${companyId}/usuarios`, {
      nome: input.name.trim(),
      email: input.email.trim(),
      ...toPermissionsRequest(input),
    })
    return toPortalUser(data)
  },

  async updatePermissions(companyId: string, userId: string, p: PortalPermissions): Promise<PortalUser> {
    if (env.useMocks) {
      const u = usersOf(companyId).find((x) => x.id === userId)!
      Object.assign(u, { modules: p.modules, allFolders: p.allFolders, folderIds: p.allFolders ? [] : p.folderIds })
      return mockDelay(u)
    }
    const { data } = await api.put<UsuarioPortalDto>(
      `/empresas/${companyId}/usuarios/${userId}`,
      toPermissionsRequest(p),
    )
    return toPortalUser(data)
  },

  async unlink(companyId: string, userId: string): Promise<void> {
    if (env.useMocks) {
      const list = usersOf(companyId)
      const u = list.find((x) => x.id === userId)!
      if (u.otherCompanies === 0)
        return mockError(409, 'Esta é a única empresa do usuário. Inative o acesso dele em vez de remover o vínculo.')
      list.splice(list.indexOf(u), 1)
      return mockDelay(undefined)
    }
    await api.delete(`/empresas/${companyId}/usuarios/${userId}`)
  },

  async resendInvite(userId: string): Promise<void> {
    if (env.useMocks) return mockDelay(undefined)
    await api.post(`/usuarios/${userId}/convite`)
  },

  async setActive(userId: string, active: boolean): Promise<void> {
    if (env.useMocks) {
      for (const list of mockUsers.values()) list.filter((u) => u.id === userId).forEach((u) => (u.active = active))
      return mockDelay(undefined)
    }
    await api.put(`/usuarios/${userId}/situacao`, { ativo: active })
  },
}
