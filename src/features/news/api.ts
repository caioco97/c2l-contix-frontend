import { api } from '@/lib/api'
import { env } from '@/config/env'
import { fetchFile } from '@/lib/download'
import { mockDelay, mockError } from '@/lib/mock'
import { mockStore } from '@/mocks/store'
import type { PagedResult } from '@/types/api'
import type { NewsDetail, NewsInput, NewsItem, NewsReach, NewsStatus, OfficeNews, OfficeNewsDetail } from '@/types/domain'
import type {
  LeituraNoticiaDto,
  NoticiaAnexoDto,
  NoticiaDto,
  NoticiaPortalDetalheDto,
  NoticiaPortalDto,
  NoticiaResumoDto,
  PagedDto,
} from '@/types/dto'

export const newsKeys = {
  all: ['news'] as const,
  list: (companyId: string, read: boolean) => ['news', companyId, read] as const,
  detail: (companyId: string, id: string) => ['news', companyId, 'detail', id] as const,
  office: (q: OfficeNewsQuery) => ['news', 'office', q] as const,
  officeDetail: (id: string) => ['news', 'office', 'detail', id] as const,
  reach: (id: string) => ['news', 'office', 'reach', id] as const,
}

export interface OfficeNewsQuery {
  search?: string
  status?: NewsStatus
  page: number
  pageSize: number
}

/* ---------- Conversão DTO (API) -> domínio (telas) ---------- */

const toAttachment = (a: NoticiaAnexoDto) => ({ id: a.id, fileName: a.nomeArquivo, sizeBytes: a.tamanhoBytes })

function toItem(dto: NoticiaPortalDto): NewsItem {
  return {
    id: dto.id,
    title: dto.titulo,
    summary: dto.resumo,
    publishedAt: dto.publicadaEm,
    isRead: dto.lida,
    hasImage: dto.possuiImagem,
    attachmentCount: dto.quantidadeAnexos,
  }
}

function toOffice(dto: NoticiaResumoDto): OfficeNews {
  return {
    id: dto.id,
    title: dto.titulo,
    summary: dto.resumo,
    publishAt: dto.publicarEm,
    expiresAt: dto.expiraEm,
    status: dto.situacao,
    audience: dto.publico,
    hasImage: dto.possuiImagem,
    attachmentCount: dto.quantidadeAnexos,
    authorName: dto.autorNome,
    recipients: dto.empresasDestinatarias,
    readers: dto.empresasLeram,
  }
}

function toOfficeDetail(dto: NoticiaDto): OfficeNewsDetail {
  return {
    id: dto.id,
    title: dto.titulo,
    summary: dto.resumo,
    content: dto.conteudo,
    publishAt: dto.publicarEm,
    expiresAt: dto.expiraEm,
    status: dto.situacao,
    audience: dto.publico,
    regimes: dto.regimes,
    companies: dto.empresas.map((e) => ({ id: e.id, name: e.nome })),
    hasImage: dto.possuiImagem,
    attachments: dto.anexos.map(toAttachment),
  }
}

function toForm(input: NewsInput) {
  const form = new FormData()
  form.append('titulo', input.title)
  if (input.summary) form.append('resumo', input.summary)
  form.append('conteudo', input.content)
  if (input.publishAt) form.append('publicarEm', input.publishAt)
  if (input.expiresAt) form.append('expiraEm', input.expiresAt)
  form.append('publico', input.audience)
  input.companyIds.forEach((id) => form.append('empresaIds', id))
  input.regimes.forEach((r) => form.append('regimes', r))
  if (input.image) form.append('imagem', input.image)
  if (input.removeImage) form.append('removerImagem', 'true')
  input.attachments.forEach((f) => form.append('anexos', f))
  input.removedAttachmentIds?.forEach((id) => form.append('anexosRemovidos', id))
  return form
}

const multipart = { headers: { 'Content-Type': 'multipart/form-data' } }

function mockStatus(publishAt: string, expiresAt: string | null): NewsStatus {
  const now = Date.now()
  if (Date.parse(publishAt) > now) return 'Agendada'
  if (expiresAt && Date.parse(expiresAt) <= now) return 'Expirada'
  return 'Publicada'
}

/* ---------- Portal da empresa ---------- */

export const newsApi = {
  async list(companyId: string, read: boolean): Promise<NewsItem[]> {
    if (env.useMocks) return mockDelay(mockStore.news(companyId).filter((n) => n.isRead === read), 250)
    const { data } = await api.get<PagedDto<NoticiaPortalDto>>(`/empresas/${companyId}/noticias`, {
      params: { status: read ? 'Lidos' : 'NaoLidos', page: 1, pageSize: 20 },
    })
    return data.items.map(toItem)
  },

  async get(companyId: string, id: string): Promise<NewsDetail> {
    if (env.useMocks) {
      const item = mockStore.news(companyId).find((n) => n.id === id)
      return item ? mockDelay(item, 200) : mockError(404, 'Notícia não encontrada')
    }
    const { data } = await api.get<NoticiaPortalDetalheDto>(`/empresas/${companyId}/noticias/${id}`)
    return {
      id: data.id,
      title: data.titulo,
      summary: data.resumo,
      content: data.conteudo,
      publishedAt: data.publicadaEm,
      isRead: data.lida,
      hasImage: data.possuiImagem,
      attachmentCount: data.anexos.length,
      attachments: data.anexos.map(toAttachment),
    }
  },

  async markAsRead(companyId: string, id: string): Promise<void> {
    if (env.useMocks) {
      const item = mockStore.news(companyId).find((n) => n.id === id)
      if (item) item.isRead = true
      return mockDelay(undefined, 150)
    }
    await api.post(`/empresas/${companyId}/noticias/${id}/lida`)
  },

  /** Imagem de capa como blob (a rota exige o token, então não dá para usar a URL direto no <img>). */
  async image(companyId: string, id: string): Promise<Blob> {
    return (await fetchFile(`/empresas/${companyId}/noticias/${id}/imagem`)).blob
  },

  async downloadAttachment(companyId: string, id: string, attachmentId: string, fileName: string) {
    if (env.useMocks) return mockDelay({ blob: new Blob([`Anexo de demonstração: ${fileName}`]), fileName }, 300)
    return fetchFile(`/empresas/${companyId}/noticias/${id}/anexos/${attachmentId}/download`, fileName)
  },
}

/* ---------- Gestão pelo escritório ---------- */

export const officeNewsApi = {
  async list(q: OfficeNewsQuery): Promise<PagedResult<OfficeNews>> {
    if (env.useMocks) {
      const term = q.search?.trim().toLowerCase()
      const items = mockStore
        .officeNews()
        .map((n) => ({ ...n, status: mockStatus(n.publishAt, n.expiresAt) }))
        .filter((n) => (!term || n.title.toLowerCase().includes(term)) && (!q.status || n.status === q.status))
        .sort((a, b) => b.publishAt.localeCompare(a.publishAt))
        .map<OfficeNews>((n) => ({
          ...n,
          summary: n.summary ?? n.content.slice(0, 200),
          attachmentCount: n.attachments.length,
          authorName: 'Colaborador Demo',
          recipients: n.audience === 'EmpresasSelecionadas' ? n.companies.length : 2,
          readers: n.id === 'n-3' ? 1 : 0,
        }))
      const start = (q.page - 1) * q.pageSize
      return mockDelay({ items: items.slice(start, start + q.pageSize), page: q.page, pageSize: q.pageSize, total: items.length })
    }
    const { data } = await api.get<PagedDto<NoticiaResumoDto>>('/noticias', {
      params: { busca: q.search?.trim() || undefined, situacao: q.status, page: q.page, pageSize: q.pageSize },
    })
    return { ...data, items: data.items.map(toOffice) }
  },

  async get(id: string): Promise<OfficeNewsDetail> {
    if (env.useMocks) {
      const n = mockStore.officeNews().find((x) => x.id === id)
      return n ? mockDelay({ ...n, status: mockStatus(n.publishAt, n.expiresAt) }, 200) : mockError(404, 'Notícia não encontrada')
    }
    const { data } = await api.get<NoticiaDto>(`/noticias/${id}`)
    return toOfficeDetail(data)
  },

  async create(input: NewsInput): Promise<OfficeNewsDetail> {
    if (env.useMocks) {
      const n: OfficeNewsDetail = {
        id: crypto.randomUUID(),
        title: input.title,
        summary: input.summary || null,
        content: input.content,
        publishAt: input.publishAt || new Date().toISOString(),
        expiresAt: input.expiresAt || null,
        status: 'Publicada',
        audience: input.audience,
        regimes: input.regimes,
        companies: input.companyIds.map((id) => ({ id, name: id })),
        hasImage: !!input.image,
        attachments: input.attachments.map((f) => ({ id: crypto.randomUUID(), fileName: f.name, sizeBytes: f.size })),
      }
      mockStore.officeNews().unshift(n)
      return mockDelay(n, 500)
    }
    const { data } = await api.post<NoticiaDto>('/noticias', toForm(input), multipart)
    return toOfficeDetail(data)
  },

  async update(id: string, input: NewsInput): Promise<OfficeNewsDetail> {
    if (env.useMocks) {
      const list = mockStore.officeNews()
      const i = list.findIndex((n) => n.id === id)
      const current = list[i]
      list[i] = {
        ...current,
        title: input.title,
        summary: input.summary || null,
        content: input.content,
        publishAt: input.publishAt || current.publishAt,
        expiresAt: input.expiresAt || null,
        audience: input.audience,
        regimes: input.regimes,
        hasImage: input.removeImage ? !!input.image : current.hasImage || !!input.image,
        attachments: [
          ...current.attachments.filter((a) => !input.removedAttachmentIds?.includes(a.id)),
          ...input.attachments.map((f) => ({ id: crypto.randomUUID(), fileName: f.name, sizeBytes: f.size })),
        ],
      }
      return mockDelay(list[i], 400)
    }
    const { data } = await api.put<NoticiaDto>(`/noticias/${id}`, toForm(input), multipart)
    return toOfficeDetail(data)
  },

  async remove(id: string): Promise<void> {
    if (env.useMocks) {
      const list = mockStore.officeNews()
      list.splice(list.findIndex((n) => n.id === id), 1)
      return mockDelay(undefined, 300)
    }
    await api.delete(`/noticias/${id}`)
  },

  async reach(id: string): Promise<NewsReach[]> {
    if (env.useMocks) {
      return mockDelay(
        [
          { companyId: 'c-1', companyName: 'Empresa Demo', read: id === 'n-3', firstReadAt: id === 'n-3' ? new Date().toISOString() : null, readers: id === 'n-3' ? 1 : 0 },
          { companyId: 'c-2', companyName: 'Outra Empresa', read: false, firstReadAt: null, readers: 0 },
        ],
        250,
      )
    }
    const { data } = await api.get<LeituraNoticiaDto[]>(`/noticias/${id}/leituras`)
    return data.map((l) => ({
      companyId: l.empresaId,
      companyName: l.empresaNome,
      read: l.lida,
      firstReadAt: l.primeiraLeituraEm,
      readers: l.leitores,
    }))
  },

  async image(id: string): Promise<Blob> {
    return (await fetchFile(`/noticias/${id}/imagem`)).blob
  },

  async downloadAttachment(id: string, attachmentId: string, fileName: string) {
    if (env.useMocks) return mockDelay({ blob: new Blob([`Anexo de demonstração: ${fileName}`]), fileName }, 300)
    return fetchFile(`/noticias/${id}/anexos/${attachmentId}/download`, fileName)
  },
}
