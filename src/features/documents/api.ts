import { endOfMonth, format, formatISO, isSameMonth, parseISO } from 'date-fns'
import { api } from '@/lib/api'
import { env } from '@/config/env'
import { mockDelay } from '@/lib/mock'
import { queryClient } from '@/lib/queryClient'
import { mockFolders, mockUser } from '@/mocks/data'
import { mockStore } from '@/mocks/store'
import type { PagedResult } from '@/types/api'
import type { DocumentFolder, DocumentItem, DueDocument, ReadFilter } from '@/types/domain'
import type { DocumentoDto, PagedDto, PastaDto, VencimentoDto } from '@/types/dto'

export type DocumentSortField = 'name' | 'publishedAt' | 'dueDate' | 'modifiedAt'

export interface DocumentQuery {
  folderId?: string
  filter: ReadFilter
  search: string
  sortBy: DocumentSortField
  sortDir: 'asc' | 'desc'
  page: number
  pageSize: number
}

export const documentKeys = {
  all: (companyId: string) => ['documents', companyId] as const,
  folders: (companyId: string) => ['documents', companyId, 'folders'] as const,
  list: (companyId: string, q: DocumentQuery) => ['documents', companyId, 'list', q] as const,
  due: (companyId: string, month: string) => ['documents', companyId, 'due', month] as const,
  recent: (companyId: string, read: boolean) => ['documents', companyId, 'recent', read] as const,
}

function collectFolderIds(folders: DocumentFolder[], id: string): string[] {
  for (const f of folders) {
    if (f.id === id) return [f.id, ...(f.children ?? []).flatMap((c) => collectFolderIds([c], c.id))]
    const found = collectFolderIds(f.children ?? [], id)
    if (found.length) return found
  }
  return []
}

function withUnreadCounts(folders: DocumentFolder[], docs: DocumentItem[]): DocumentFolder[] {
  return folders.map((f) => {
    const ids = collectFolderIds(folders, f.id)
    return {
      ...f,
      unreadCount: docs.filter((d) => ids.includes(d.folderId) && !d.isRead).length,
      children: f.children ? withUnreadCounts(f.children, docs) : undefined,
    }
  })
}

/* ---------- Conversão DTO (API) -> domínio (telas) ---------- */

const SORT_FIELD: Record<DocumentSortField, string> = {
  name: 'nome',
  publishedAt: 'publicadoEm',
  dueDate: 'dataVencimento',
  modifiedAt: 'modificado',
}
const READ_STATUS: Record<ReadFilter, string> = { all: 'Todos', unread: 'NaoLidos', read: 'Lidos' }

function toFolder(dto: PastaDto): DocumentFolder {
  return {
    id: dto.id,
    name: dto.nome,
    parentId: dto.pastaPaiId,
    unreadCount: dto.documentosNaoLidos,
    clientCanUpload: dto.permiteUploadCliente,
    children: dto.subpastas?.length
      ? [...dto.subpastas].sort((a, b) => a.ordem - b.ordem).map(toFolder)
      : undefined,
  }
}

function folderPaths(folders: DocumentFolder[], prefix = '', acc = new Map<string, string>()) {
  for (const f of folders) {
    const path = prefix ? `${prefix}/${f.name}` : f.name
    acc.set(f.id, path)
    if (f.children) folderPaths(f.children, path, acc)
  }
  return acc
}

function toDocument(dto: DocumentoDto, paths: Map<string, string>): DocumentItem {
  return {
    id: dto.id,
    folderId: dto.pastaId,
    folderPath: paths.get(dto.pastaId) ?? '',
    name: dto.nome,
    comment: dto.comentario,
    publishedAt: dto.publicadoEm,
    dueDate: dto.dataVencimento,
    addedBy: dto.adicionadoPorNome,
    modifiedAt: dto.updatedAt ?? dto.publicadoEm,
    sizeBytes: dto.tamanhoBytes,
    isRead: dto.lido,
  }
}

/** Caminhos das pastas (para exibir "Pessoal/DARF DCTFWeb"), reaproveitando o cache da árvore. */
async function getFolderPaths(companyId: string) {
  const folders = await queryClient.ensureQueryData({
    queryKey: documentKeys.folders(companyId),
    queryFn: () => documentsApi.folders(companyId),
  })
  return folderPaths(folders)
}

async function fetchDocuments(companyId: string, params: Record<string, unknown>) {
  const [{ data }, paths] = await Promise.all([
    api.get<PagedDto<DocumentoDto>>(`/empresas/${companyId}/documentos`, { params }),
    getFolderPaths(companyId),
  ])
  return { ...data, items: data.items.map((d) => toDocument(d, paths)) }
}

export const documentsApi = {
  async folders(companyId: string): Promise<DocumentFolder[]> {
    if (env.useMocks) return mockDelay(withUnreadCounts(mockFolders, mockStore.documents(companyId)), 200)
    const { data } = await api.get<PastaDto[]>(`/empresas/${companyId}/pastas`)
    return [...data].sort((a, b) => a.ordem - b.ordem).map(toFolder)
  },

  async list(companyId: string, q: DocumentQuery): Promise<PagedResult<DocumentItem>> {
    if (env.useMocks) {
      // Igual à API: só a pasta exata, sem subpastas.
      const folderIds = q.folderId ? [q.folderId] : null
      const term = q.search.trim().toLowerCase()
      const items = mockStore
        .documents(companyId)
        .filter((d) => !folderIds || folderIds.includes(d.folderId))
        .filter((d) => (q.filter === 'all' ? true : q.filter === 'read' ? d.isRead : !d.isRead))
        .filter((d) => !term || d.name.toLowerCase().includes(term) || d.comment?.toLowerCase().includes(term))
        .sort((a, b) => {
          const av = a[q.sortBy] ?? ''
          const bv = b[q.sortBy] ?? ''
          const cmp = av.localeCompare(bv, 'pt-BR')
          return q.sortDir === 'asc' ? cmp : -cmp
        })
      const start = (q.page - 1) * q.pageSize
      return mockDelay({ items: items.slice(start, start + q.pageSize), page: q.page, pageSize: q.pageSize, total: items.length })
    }
    return fetchDocuments(companyId, {
      pastaId: q.folderId,
      busca: q.search || undefined,
      status: READ_STATUS[q.filter],
      orderBy: SORT_FIELD[q.sortBy],
      desc: q.sortDir === 'desc',
      page: q.page,
      pageSize: q.pageSize,
    })
  },

  /** Documentos com vencimento no mês informado (yyyy-MM). */
  async dueInMonth(companyId: string, month: string): Promise<DueDocument[]> {
    const ref = parseISO(`${month}-01`)
    if (env.useMocks) {
      return mockDelay(
        mockStore
          .documents(companyId)
          .filter((d) => d.dueDate && isSameMonth(parseISO(d.dueDate), ref))
          .map((d) => ({
            id: d.id,
            name: d.name,
            dueDate: formatISO(parseISO(d.dueDate!), { representation: 'date' }),
            folderId: d.folderId,
            folderPath: d.folderPath,
            isRead: d.isRead,
          })),
        250,
      )
    }
    const { data } = await api.get<VencimentoDto[]>(`/empresas/${companyId}/documentos/vencimentos`, {
      params: { inicio: format(ref, 'yyyy-MM-dd'), fim: format(endOfMonth(ref), 'yyyy-MM-dd') },
    })
    return data.map((v) => ({
      id: v.documentoId,
      name: v.nome,
      dueDate: v.dataVencimento,
      folderId: v.pastaId,
      folderPath: v.caminhoPasta,
      isRead: v.lido,
    }))
  },

  async recent(companyId: string, read: boolean): Promise<DocumentItem[]> {
    if (env.useMocks) {
      return mockDelay(
        mockStore
          .documents(companyId)
          .filter((d) => d.isRead === read)
          .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
          .slice(0, 5),
        250,
      )
    }
    const data = await fetchDocuments(companyId, {
      status: read ? 'Lidos' : 'NaoLidos',
      orderBy: 'publicadoEm',
      desc: true,
      page: 1,
      pageSize: 5,
    })
    return data.items
  },

  /** Baixa um ou mais documentos (vários vêm em .zip); o servidor já marca como lidos. */
  async download(companyId: string, ids: string[]): Promise<{ blob: Blob; fileName: string }> {
    if (env.useMocks) {
      const docs = mockStore.documents(companyId).filter((d) => ids.includes(d.id))
      docs.forEach((d) => (d.isRead = true))
      const fileName = docs.length === 1 ? docs[0].name : 'documentos.zip'
      const blob = new Blob([`Arquivo de demonstração do Contix: ${docs.map((d) => d.name).join(', ')}`], {
        type: 'text/plain',
      })
      return mockDelay({ blob, fileName }, 400)
    }
    const res =
      ids.length === 1
        ? await api.get(`/empresas/${companyId}/documentos/${ids[0]}/download`, { responseType: 'blob' })
        : await api.post(`/empresas/${companyId}/documentos/download`, { documentoIds: ids }, { responseType: 'blob' })
    const disposition = String(res.headers['content-disposition'] ?? '')
    const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition)
    return { blob: res.data as Blob, fileName: match ? decodeURIComponent(match[1]) : 'documentos.zip' }
  },

  /** Marca como lido sem baixar (o download já marca no servidor). */
  async markAsRead(companyId: string, id: string): Promise<void> {
    if (env.useMocks) {
      const doc = mockStore.documents(companyId).find((d) => d.id === id)
      if (doc) doc.isRead = true
      return mockDelay(undefined, 150)
    }
    await api.post(`/empresas/${companyId}/documentos/${id}/lido`)
  },

  async remove(companyId: string, ids: string[]): Promise<void> {
    if (env.useMocks) {
      const list = mockStore.documents(companyId)
      for (let i = list.length - 1; i >= 0; i--) if (ids.includes(list[i].id)) list.splice(i, 1)
      return mockDelay(undefined, 300)
    }
    await Promise.all(ids.map((id) => api.delete(`/empresas/${companyId}/documentos/${id}`)))
  },

  async upload(
    companyId: string,
    input: { folderId: string; folderPath: string; files: File[]; comment?: string; dueDate?: string },
  ): Promise<void> {
    if (env.useMocks) {
      const now = mockStore.now()
      mockStore.documents(companyId).unshift(
        ...input.files.map((f) => ({
          id: crypto.randomUUID(),
          folderId: input.folderId,
          folderPath: input.folderPath,
          name: f.name,
          comment: input.comment || null,
          publishedAt: now,
          dueDate: input.dueDate ? new Date(`${input.dueDate}T00:00:00`).toISOString() : null,
          addedBy: mockUser.name,
          modifiedAt: now,
          sizeBytes: f.size,
          isRead: true,
        })),
      )
      return mockDelay(undefined, 700)
    }
    const form = new FormData()
    form.append('pastaId', input.folderId)
    input.files.forEach((f) => form.append('arquivos', f))
    if (input.comment) form.append('comentario', input.comment)
    if (input.dueDate) form.append('dataVencimento', input.dueDate)
    await api.post(`/empresas/${companyId}/documentos`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  /** Envio por e-mail ainda não existe na API: segue simulado. */
  async send(_companyId: string, _input: { ids: string[]; message: string }): Promise<void> {
    return mockDelay(undefined, 500)
  },
}

export function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
