import { api } from '@/lib/api'
import { env } from '@/config/env'
import { mockDelay, mockError } from '@/lib/mock'
import { mockUser } from '@/mocks/data'
import { mockStore } from '@/mocks/store'
import type { PagedResult } from '@/types/api'
import type { Department, Task, TaskDetail, TaskEvent, TaskInput, TaskStatus } from '@/types/domain'
import type { InteracaoTarefaDto, PagedDto, StatusTarefaDto, TarefaDto, TarefaResumoDto } from '@/types/dto'

/* ---------- Conversão DTO (API) <-> domínio (telas) ---------- */

const STATUS_FROM_API: Record<StatusTarefaDto, TaskStatus> = {
  Pendente: 'Pending',
  EmAndamento: 'InProgress',
  Concluida: 'Done',
  Cancelada: 'Canceled',
}
const STATUS_TO_API = Object.fromEntries(Object.entries(STATUS_FROM_API).map(([k, v]) => [v, k])) as Record<
  TaskStatus,
  StatusTarefaDto
>

const EVENT_KIND = { Criacao: 'created', Comentario: 'comment', MudancaStatus: 'status', Edicao: 'edit' } as const

function toTask(dto: TarefaResumoDto): Task {
  return {
    id: dto.id,
    number: dto.numero,
    companyId: dto.empresaId,
    companyName: dto.empresaNome,
    title: dto.titulo,
    department: dto.departamento,
    status: STATUS_FROM_API[dto.status],
    assigneeId: dto.responsavelId,
    assigneeName: dto.responsavelNome,
    internalDueDate: dto.prazoInterno,
    legalDueDate: dto.prazoLegal,
    isOverdue: dto.atrasada,
    isLegalOverdue: dto.prazoLegalVencido,
    comments: dto.comentarios,
    attachments: dto.anexos,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt ?? dto.createdAt,
  }
}

function toEvent(dto: InteracaoTarefaDto): TaskEvent {
  return {
    id: dto.id,
    kind: EVENT_KIND[dto.tipo],
    message: dto.mensagem,
    fromStatus: dto.statusAnterior ? STATUS_FROM_API[dto.statusAnterior] : null,
    toStatus: dto.statusNovo ? STATUS_FROM_API[dto.statusNovo] : null,
    authorName: dto.autorNome,
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

function toDetail(dto: TarefaDto): TaskDetail {
  const history = dto.historico.map(toEvent)
  return {
    ...toTask({
      ...dto,
      comentarios: history.filter((e) => e.kind === 'comment').length,
      anexos: history.reduce((n, e) => n + e.attachments.length, 0),
    }),
    description: dto.descricao,
    createdByName: dto.criadoPorNome,
    completedAt: dto.concluidaEm,
    allowedTransitions: dto.transicoesPermitidas.map((s) => STATUS_FROM_API[s]),
    history,
  }
}

const toBody = (input: TaskInput) => ({
  titulo: input.title,
  descricao: input.description ?? undefined,
  departamento: input.department,
  responsavelId: input.assigneeId,
  prazoInterno: input.internalDueDate,
  prazoLegal: input.legalDueDate ?? undefined,
})

/* ---------- Consultas ---------- */

export interface TaskFilters {
  status?: TaskStatus
  /** Só Pendente e Em andamento. */
  open?: boolean
  department?: Department
  assigneeId?: string
  overdue?: boolean
  /** Prazo interno até esta data (yyyy-MM-dd). */
  dueUntil?: string
  companyId?: string
  search?: string
  sortBy?: 'prazo' | 'prazoLegal' | 'numero' | 'status' | 'createdAt'
  sortDesc?: boolean
  page: number
  pageSize: number
}

function toParams(f: TaskFilters) {
  return {
    status: f.status ? STATUS_TO_API[f.status] : undefined,
    emAberto: f.open || undefined,
    departamento: f.department,
    responsavelId: f.assigneeId,
    atrasadas: f.overdue || undefined,
    prazoAte: f.dueUntil,
    empresaId: f.companyId,
    busca: f.search?.trim() || undefined,
    orderBy: f.sortBy,
    desc: f.sortDesc,
    page: f.page,
    pageSize: f.pageSize,
  }
}

export const taskKeys = {
  all: ['tasks'] as const,
  list: (f: TaskFilters) => ['tasks', 'list', f] as const,
  ofCompany: (companyId: string, f: TaskFilters) => ['tasks', 'company', companyId, f] as const,
  detail: (companyId: string, id: string) => ['tasks', 'detail', companyId, id] as const,
}

const MULTIPART = { headers: { 'Content-Type': 'multipart/form-data' } }

function multipart(fields: Record<string, string | undefined | null>, files: File[]) {
  const form = new FormData()
  for (const [k, v] of Object.entries(fields)) if (v !== undefined && v !== null && v !== '') form.append(k, v)
  files.forEach((f) => form.append('anexos', f))
  return form
}

export const tasksApi = {
  /** Tarefas de todas as empresas. */
  async list(f: TaskFilters): Promise<PagedResult<Task>> {
    if (env.useMocks) return mockDelay(mockTasks.page(mockStore.allTasks(), f), 250)
    const { data } = await api.get<PagedDto<TarefaResumoDto>>('/tarefas', { params: toParams(f) })
    return { ...data, items: data.items.map(toTask) }
  },

  async listOfCompany(companyId: string, f: TaskFilters): Promise<PagedResult<Task>> {
    if (env.useMocks) return mockDelay(mockTasks.page(mockStore.tasks(companyId), f), 250)
    const { data } = await api.get<PagedDto<TarefaResumoDto>>(`/empresas/${companyId}/tarefas`, { params: toParams(f) })
    return { ...data, items: data.items.map(toTask) }
  },

  async get(companyId: string, id: string): Promise<TaskDetail> {
    if (env.useMocks) {
      const found = mockTasks.find(companyId, id)
      return found ? mockDelay(found, 200) : mockError(404, 'Tarefa não encontrada.')
    }
    const { data } = await api.get<TarefaDto>(`/empresas/${companyId}/tarefas/${id}`)
    return toDetail(data)
  },

  async create(companyId: string, input: TaskInput, attachments: File[]): Promise<TaskDetail> {
    if (env.useMocks) return mockDelay(mockTasks.create(companyId, input, attachments), 500)
    const { data } = await api.post<TarefaDto>(`/empresas/${companyId}/tarefas`, multipart(toBody(input), attachments), MULTIPART)
    return toDetail(data)
  },

  async update(companyId: string, id: string, input: TaskInput): Promise<TaskDetail> {
    if (env.useMocks) return mockDelay(mockTasks.update(companyId, id, input), 400)
    const { data } = await api.put<TarefaDto>(`/empresas/${companyId}/tarefas/${id}`, {
      ...toBody(input),
      descricao: input.description,
      prazoLegal: input.legalDueDate,
    })
    return toDetail(data)
  },

  async comment(companyId: string, id: string, input: { message: string; attachments: File[] }) {
    if (env.useMocks) return mockDelay(mockTasks.comment(companyId, id, input), 400)
    const form = multipart({ mensagem: input.message }, input.attachments)
    const { data } = await api.post<TarefaDto>(`/empresas/${companyId}/tarefas/${id}/comentarios`, form, MULTIPART)
    return toDetail(data)
  },

  async changeStatus(companyId: string, id: string, status: TaskStatus, message?: string) {
    if (env.useMocks) return mockDelay(mockTasks.changeStatus(companyId, id, status, message), 400)
    const { data } = await api.post<TarefaDto>(`/empresas/${companyId}/tarefas/${id}/status`, {
      status: STATUS_TO_API[status],
      mensagem: message || undefined,
    })
    return toDetail(data)
  },

  async downloadAttachment(companyId: string, id: string, attachmentId: string): Promise<Blob> {
    if (env.useMocks) return mockDelay(new Blob(['Anexo de demonstração do Contix'], { type: 'text/plain' }), 300)
    const { data } = await api.get<Blob>(`/empresas/${companyId}/tarefas/${id}/anexos/${attachmentId}/download`, {
      responseType: 'blob',
    })
    return data
  },
}

/* ---------- Mocks (modo sem API) ---------- */

const TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  Pending: ['InProgress', 'Done', 'Canceled'],
  InProgress: ['Pending', 'Done', 'Canceled'],
  Done: ['InProgress'],
  Canceled: ['Pending'],
}

const today = () => new Date().toISOString().slice(0, 10)
const isClosed = (s: TaskStatus) => s === 'Done' || s === 'Canceled'

const mockTasks = {
  find: (companyId: string, id: string) => mockStore.tasks(companyId).find((t) => t.id === id),

  page(list: TaskDetail[], f: TaskFilters): PagedResult<Task> {
    const term = f.search?.trim().replace(/^#/, '').toLowerCase()
    const items = list
      .filter((t) => !f.companyId || t.companyId === f.companyId)
      .filter((t) => !f.status || t.status === f.status)
      .filter((t) => !f.open || !isClosed(t.status))
      .filter((t) => !f.department || t.department === f.department)
      .filter((t) => !f.assigneeId || t.assigneeId === f.assigneeId)
      .filter((t) => !f.overdue || t.isOverdue)
      .filter((t) => !f.dueUntil || t.internalDueDate <= f.dueUntil)
      .filter((t) => !term || String(t.number) === term || t.title.toLowerCase().includes(term))
      .sort((a, b) => a.internalDueDate.localeCompare(b.internalDueDate))
    const start = (f.page - 1) * f.pageSize
    return { items: items.slice(start, start + f.pageSize), page: f.page, pageSize: f.pageSize, total: items.length }
  },

  event(kind: TaskEvent['kind'], extra: Partial<TaskEvent> = {}): TaskEvent {
    return {
      id: crypto.randomUUID(),
      kind,
      message: null,
      fromStatus: null,
      toStatus: null,
      authorName: mockUser.name,
      createdAt: mockStore.now(),
      attachments: [],
      ...extra,
    }
  },

  attachments: (files: File[]) =>
    files.map((f) => ({ id: crypto.randomUUID(), fileName: f.name, sizeBytes: f.size, uploadedBy: mockUser.name, createdAt: mockStore.now() })),

  refresh(t: TaskDetail) {
    t.isOverdue = !isClosed(t.status) && t.internalDueDate < today()
    t.isLegalOverdue = !isClosed(t.status) && !!t.legalDueDate && t.legalDueDate < today()
    t.allowedTransitions = TRANSITIONS[t.status]
    t.comments = t.history.filter((e) => e.kind === 'comment').length
    t.attachments = t.history.reduce((n, e) => n + e.attachments.length, 0)
    t.updatedAt = mockStore.now()
    return t
  },

  create(companyId: string, input: TaskInput, files: File[]): TaskDetail {
    const now = mockStore.now()
    const t: TaskDetail = {
      id: crypto.randomUUID(),
      number: Math.max(0, ...mockStore.allTasks().map((x) => x.number)) + 1,
      companyId,
      companyName: 'Empresa',
      ...input,
      status: 'Pending',
      assigneeName: mockUser.name,
      isOverdue: false,
      isLegalOverdue: false,
      comments: 0,
      attachments: 0,
      createdAt: now,
      updatedAt: now,
      createdByName: mockUser.name,
      completedAt: null,
      allowedTransitions: [],
      history: [mockTasks.event('created', { toStatus: 'Pending', message: input.description, attachments: mockTasks.attachments(files) })],
    }
    mockStore.tasks(companyId).unshift(t)
    return mockTasks.refresh(t)
  },

  update(companyId: string, id: string, input: TaskInput) {
    const t = mockTasks.find(companyId, id)!
    Object.assign(t, input)
    t.history.push(mockTasks.event('edit', { message: 'Alterou os dados da tarefa.' }))
    return mockTasks.refresh(t)
  },

  comment(companyId: string, id: string, input: { message: string; attachments: File[] }) {
    const t = mockTasks.find(companyId, id)!
    t.history.push(mockTasks.event('comment', { message: input.message || null, attachments: mockTasks.attachments(input.attachments) }))
    return mockTasks.refresh(t)
  },

  changeStatus(companyId: string, id: string, status: TaskStatus, message?: string) {
    const t = mockTasks.find(companyId, id)!
    t.history.push(mockTasks.event('status', { fromStatus: t.status, toStatus: status, message: message || null }))
    t.status = status
    t.completedAt = status === 'Done' ? mockStore.now() : null
    return mockTasks.refresh(t)
  },
}
