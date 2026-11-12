import { api } from '@/lib/api'
import { env } from '@/config/env'
import { mockDelay, mockError } from '@/lib/mock'
import { mockRequestTypes, mockUser } from '@/mocks/data'
import { mockStore } from '@/mocks/store'
import type { PagedResult } from '@/types/api'
import type {
  Department,
  OfficeUser,
  RequestEvent,
  ServiceRequest,
  ServiceRequestDetail,
  ServiceRequestStatus,
  ServiceRequestType,
  ServiceRequestTypeCode,
} from '@/types/domain'
import type {
  InteracaoDto,
  PagedDto,
  SolicitacaoDto,
  SolicitacaoResumoDto,
  StatusSolicitacaoDto,
  TipoSolicitacaoDto,
  UsuarioResumoDto,
} from '@/types/dto'

/* ---------- Conversão DTO (API) <-> domínio (telas) ---------- */

const STATUS_FROM_API: Record<StatusSolicitacaoDto, ServiceRequestStatus> = {
  Aberta: 'Open',
  EmAnalise: 'InAnalysis',
  AguardandoCliente: 'WaitingClient',
  Concluida: 'Done',
  Cancelada: 'Canceled',
}
const STATUS_TO_API = Object.fromEntries(
  Object.entries(STATUS_FROM_API).map(([k, v]) => [v, k]),
) as Record<ServiceRequestStatus, StatusSolicitacaoDto>

const EVENT_KIND = { Abertura: 'opened', Comentario: 'comment', MudancaStatus: 'status', Atribuicao: 'assignment' } as const

function toType(dto: TipoSolicitacaoDto): ServiceRequestType {
  return {
    code: dto.codigo,
    name: dto.nome,
    description: dto.descricao,
    department: dto.departamento,
    deadlineDays: dto.prazoDias,
    requiresAttachment: dto.exigeAnexo,
    attachmentHint: dto.orientacaoAnexo,
  }
}

function toRequest(dto: SolicitacaoResumoDto): ServiceRequest {
  return {
    id: dto.id,
    number: dto.numero,
    companyId: dto.empresaId,
    companyName: dto.empresaNome,
    typeCode: dto.tipo,
    typeName: dto.tipoNome,
    subject: dto.assunto,
    department: dto.departamento,
    status: STATUS_FROM_API[dto.status],
    requesterName: dto.solicitanteNome,
    assigneeId: dto.responsavelId,
    assigneeName: dto.responsavelNome,
    dueDate: dto.prazo,
    isOverdue: dto.atrasada,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt ?? dto.createdAt,
  }
}

function toEvent(dto: InteracaoDto): RequestEvent {
  return {
    id: dto.id,
    kind: EVENT_KIND[dto.tipo],
    message: dto.mensagem,
    fromStatus: dto.statusAnterior ? STATUS_FROM_API[dto.statusAnterior] : null,
    toStatus: dto.statusNovo ? STATUS_FROM_API[dto.statusNovo] : null,
    authorName: dto.autorNome,
    authorIsOffice: dto.autorEhEscritorio,
    createdAt: dto.createdAt,
    attachments: dto.anexos.map((a) => ({
      id: a.id,
      fileName: a.nomeArquivo,
      sizeBytes: a.tamanhoBytes,
      uploadedBy: a.enviadoPorNome,
      createdAt: a.createdAt,
    })),
  }
}

function toDetail(dto: SolicitacaoDto): ServiceRequestDetail {
  return {
    ...toRequest(dto),
    description: dto.descricao,
    data: dto.dados,
    closedAt: dto.finalizadaEm,
    allowedTransitions: dto.transicoesPermitidas.map((s) => STATUS_FROM_API[s]),
    history: dto.historico.map(toEvent),
  }
}

/* ---------- Consultas ---------- */

export interface RequestFilters {
  status?: ServiceRequestStatus
  /** Só não finalizadas. */
  inProgress?: boolean
  typeCode?: ServiceRequestTypeCode
  department?: Department
  assigneeId?: string
  unassigned?: boolean
  overdue?: boolean
  companyId?: string
  search?: string
  sortBy?: 'createdAt' | 'numero' | 'prazo' | 'status' | 'atualizado'
  sortDesc?: boolean
  page: number
  pageSize: number
}

function toParams(f: RequestFilters) {
  return {
    status: f.status ? STATUS_TO_API[f.status] : undefined,
    emAndamento: f.inProgress || undefined,
    tipo: f.typeCode,
    departamento: f.department,
    responsavelId: f.assigneeId,
    semResponsavel: f.unassigned || undefined,
    atrasadas: f.overdue || undefined,
    empresaId: f.companyId,
    busca: f.search?.trim() || undefined,
    orderBy: f.sortBy,
    desc: f.sortDesc,
    page: f.page,
    pageSize: f.pageSize,
  }
}

export interface CreateRequestInput {
  typeCode: ServiceRequestTypeCode
  subject?: string
  department?: Department
  description?: string
  /** Campos específicos do tipo, com os nomes da API. */
  data?: Record<string, unknown>
  attachments: File[]
}

export const requestKeys = {
  types: ['requests', 'types'] as const,
  all: ['requests'] as const,
  list: (companyId: string, f: RequestFilters) => ['requests', 'company', companyId, f] as const,
  queue: (f: RequestFilters) => ['requests', 'queue', f] as const,
  detail: (companyId: string, id: string) => ['requests', 'detail', companyId, id] as const,
  officeUsers: ['requests', 'office-users'] as const,
}

function multipart(fields: Record<string, string | undefined>, files: File[]) {
  const form = new FormData()
  for (const [k, v] of Object.entries(fields)) if (v !== undefined && v !== '') form.append(k, v)
  files.forEach((f) => form.append('anexos', f))
  return form
}

const MULTIPART = { headers: { 'Content-Type': 'multipart/form-data' } }

export const requestsApi = {
  async types(): Promise<ServiceRequestType[]> {
    if (env.useMocks) return mockDelay(mockRequestTypes, 200)
    const { data } = await api.get<TipoSolicitacaoDto[]>('/solicitacoes/tipos')
    return data.map(toType)
  },

  /** Solicitações de uma empresa (portal do cliente). */
  async list(companyId: string, f: RequestFilters): Promise<PagedResult<ServiceRequest>> {
    if (env.useMocks) return mockDelay(mockRequests.page(mockRequests.of(companyId), f), 250)
    const { data } = await api.get<PagedDto<SolicitacaoResumoDto>>(`/empresas/${companyId}/solicitacoes`, {
      params: toParams(f),
    })
    return { ...data, items: data.items.map(toRequest) }
  },

  /** Fila de atendimento do escritório (todas as empresas). */
  async queue(f: RequestFilters): Promise<PagedResult<ServiceRequest>> {
    if (env.useMocks) return mockDelay(mockRequests.page(mockRequests.everything(), f), 250)
    const { data } = await api.get<PagedDto<SolicitacaoResumoDto>>('/solicitacoes', { params: toParams(f) })
    return { ...data, items: data.items.map(toRequest) }
  },

  async get(companyId: string, id: string): Promise<ServiceRequestDetail> {
    if (env.useMocks) {
      const found = mockRequests.find(companyId, id)
      return found ? mockDelay(found, 200) : mockError(404, 'Solicitação não encontrada.')
    }
    const { data } = await api.get<SolicitacaoDto>(`/empresas/${companyId}/solicitacoes/${id}`)
    return toDetail(data)
  },

  async create(companyId: string, input: CreateRequestInput): Promise<ServiceRequestDetail> {
    if (env.useMocks) return mockDelay(mockRequests.create(companyId, input), 600)
    const form = multipart(
      {
        tipo: input.typeCode,
        assunto: input.subject,
        departamento: input.department,
        descricao: input.description,
        dados: input.data ? JSON.stringify(input.data) : undefined,
      },
      input.attachments,
    )
    const { data } = await api.post<SolicitacaoDto>(`/empresas/${companyId}/solicitacoes`, form, MULTIPART)
    return toDetail(data)
  },

  async comment(companyId: string, id: string, input: { message: string; attachments: File[] }) {
    if (env.useMocks) return mockDelay(mockRequests.comment(companyId, id, input), 400)
    const form = multipart({ mensagem: input.message }, input.attachments)
    const { data } = await api.post<SolicitacaoDto>(`/empresas/${companyId}/solicitacoes/${id}/comentarios`, form, MULTIPART)
    return toDetail(data)
  },

  async changeStatus(companyId: string, id: string, status: ServiceRequestStatus, message?: string) {
    if (env.useMocks) return mockDelay(mockRequests.changeStatus(companyId, id, status, message), 400)
    const { data } = await api.post<SolicitacaoDto>(`/empresas/${companyId}/solicitacoes/${id}/status`, {
      status: STATUS_TO_API[status],
      mensagem: message || undefined,
    })
    return toDetail(data)
  },

  async assign(companyId: string, id: string, input: { assigneeId: string | null; dueDate: string | null }) {
    if (env.useMocks) return mockDelay(mockRequests.assign(companyId, id, input), 400)
    const { data } = await api.put<SolicitacaoDto>(`/empresas/${companyId}/solicitacoes/${id}/atribuicao`, {
      responsavelId: input.assigneeId,
      prazo: input.dueDate,
    })
    return toDetail(data)
  },

  async downloadAttachment(companyId: string, id: string, attachmentId: string): Promise<Blob> {
    if (env.useMocks) return mockDelay(new Blob(['Anexo de demonstração do Contix'], { type: 'text/plain' }), 300)
    const { data } = await api.get<Blob>(
      `/empresas/${companyId}/solicitacoes/${id}/anexos/${attachmentId}/download`,
      { responseType: 'blob' },
    )
    return data
  },

  /** Usuários do escritório que podem ser responsáveis. */
  async officeUsers(): Promise<OfficeUser[]> {
    if (env.useMocks) return mockDelay([{ id: mockUser.id, name: mockUser.name }], 150)
    const { data } = await api.get<PagedDto<UsuarioResumoDto>>('/usuarios', {
      params: { ativo: true, pageSize: 100, page: 1 },
    })
    return data.items.filter((u) => u.perfil !== 'Cliente').map((u) => ({ id: u.id, name: u.nome }))
  },
}

/* ---------- Mocks (modo sem API) ---------- */

const mockRequests = {
  of: (companyId: string) => mockStore.requests(companyId),
  everything: () => mockStore.allRequests(),
  find: (companyId: string, id: string) => mockStore.requests(companyId).find((r) => r.id === id),

  page(list: ServiceRequestDetail[], f: RequestFilters): PagedResult<ServiceRequest> {
    const term = f.search?.trim().replace(/^#/, '').toLowerCase()
    const items = list
      .filter((r) => !f.status || r.status === f.status)
      .filter((r) => !f.inProgress || !['Done', 'Canceled'].includes(r.status))
      .filter((r) => !f.typeCode || r.typeCode === f.typeCode)
      .filter((r) => !f.department || r.department === f.department)
      .filter((r) => !f.assigneeId || r.assigneeId === f.assigneeId)
      .filter((r) => !f.unassigned || !r.assigneeId)
      .filter((r) => !f.overdue || r.isOverdue)
      .filter((r) => !term || String(r.number) === term || r.subject.toLowerCase().includes(term))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    const start = (f.page - 1) * f.pageSize
    return { items: items.slice(start, start + f.pageSize), page: f.page, pageSize: f.pageSize, total: items.length }
  },

  event(kind: RequestEvent['kind'], extra: Partial<RequestEvent> = {}): RequestEvent {
    return {
      id: crypto.randomUUID(),
      kind,
      message: null,
      fromStatus: null,
      toStatus: null,
      authorName: mockUser.name,
      authorIsOffice: false,
      createdAt: mockStore.now(),
      attachments: [],
      ...extra,
    }
  },

  attachments: (files: File[]) =>
    files.map((f) => ({ id: crypto.randomUUID(), fileName: f.name, sizeBytes: f.size, uploadedBy: mockUser.name, createdAt: mockStore.now() })),

  create(companyId: string, input: CreateRequestInput): ServiceRequestDetail {
    const type = mockRequestTypes.find((t) => t.code === input.typeCode)!
    const all = mockStore.allRequests()
    const now = mockStore.now()
    const created: ServiceRequestDetail = {
      id: crypto.randomUUID(),
      number: Math.max(0, ...all.map((r) => r.number)) + 1,
      companyId,
      companyName: 'Empresa',
      typeCode: input.typeCode,
      typeName: type.name,
      subject: input.subject || `${type.name}${input.data?.empregado ? ` - ${input.data.empregado}` : ''}`,
      department: input.department ?? type.department,
      status: 'Open',
      requesterName: mockUser.name,
      assigneeId: null,
      assigneeName: null,
      dueDate: new Date(Date.now() + type.deadlineDays * 86_400_000).toISOString().slice(0, 10),
      isOverdue: false,
      createdAt: now,
      updatedAt: now,
      description: input.description || null,
      data: input.data ?? null,
      closedAt: null,
      allowedTransitions: ['Canceled'],
      history: [],
    }
    created.history.push(
      mockRequests.event('opened', { toStatus: 'Open', message: created.description, attachments: mockRequests.attachments(input.attachments) }),
    )
    mockStore.requests(companyId).unshift(created)
    return created
  },

  comment(companyId: string, id: string, input: { message: string; attachments: File[] }) {
    const r = mockRequests.find(companyId, id)!
    r.history.push(mockRequests.event('comment', { message: input.message, attachments: mockRequests.attachments(input.attachments) }))
    if (r.status === 'WaitingClient') mockRequests.changeStatus(companyId, id, 'InAnalysis', 'Resposta do cliente recebida.')
    r.updatedAt = mockStore.now()
    return r
  },

  changeStatus(companyId: string, id: string, status: ServiceRequestStatus, message?: string) {
    const r = mockRequests.find(companyId, id)!
    r.history.push(mockRequests.event('status', { fromStatus: r.status, toStatus: status, message: message || null }))
    r.status = status
    r.allowedTransitions = status === 'Open' || status === 'WaitingClient' ? ['Canceled'] : []
    r.updatedAt = mockStore.now()
    return r
  },

  assign(companyId: string, id: string, input: { assigneeId: string | null; dueDate: string | null }) {
    const r = mockRequests.find(companyId, id)!
    r.assigneeId = input.assigneeId
    r.assigneeName = input.assigneeId ? mockUser.name : null
    r.dueDate = input.dueDate
    r.history.push(mockRequests.event('assignment', { message: input.assigneeId ? `Responsável: ${mockUser.name}.` : 'Responsável removido.' }))
    return r
  },
}
