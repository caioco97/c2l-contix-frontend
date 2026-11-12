import { isSameMonth, parseISO } from 'date-fns'
import { api } from '@/lib/api'
import { env } from '@/config/env'
import { mockDelay } from '@/lib/mock'
import { mockFolders, mockUser } from '@/mocks/data'
import { mockStore } from '@/mocks/store'
import type { PagedResult } from '@/types/api'
import type { DocumentFolder, DocumentItem, ReadFilter } from '@/types/domain'

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

export const documentsApi = {
  async folders(companyId: string): Promise<DocumentFolder[]> {
    if (env.useMocks) return mockDelay(withUnreadCounts(mockFolders, mockStore.documents(companyId)), 200)
    const { data } = await api.get<DocumentFolder[]>(`/companies/${companyId}/folders`)
    return data
  },

  async list(companyId: string, q: DocumentQuery): Promise<PagedResult<DocumentItem>> {
    if (env.useMocks) {
      const folderIds = q.folderId ? collectFolderIds(mockFolders, q.folderId) : null
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
    const { data } = await api.get<PagedResult<DocumentItem>>(`/companies/${companyId}/documents`, { params: q })
    return data
  },

  /** Documentos com vencimento no mês informado (yyyy-MM). */
  async dueInMonth(companyId: string, month: string): Promise<DocumentItem[]> {
    if (env.useMocks) {
      const ref = parseISO(`${month}-01`)
      return mockDelay(mockStore.documents(companyId).filter((d) => d.dueDate && isSameMonth(parseISO(d.dueDate), ref)), 250)
    }
    const { data } = await api.get<DocumentItem[]>(`/companies/${companyId}/documents/due`, { params: { month } })
    return data
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
    const { data } = await api.get<PagedResult<DocumentItem>>(`/companies/${companyId}/documents`, {
      params: { filter: read ? 'read' : 'unread', pageSize: 5, sortBy: 'publishedAt', sortDir: 'desc' },
    })
    return data.items
  },

  /** Baixa um ou mais documentos (vários vêm em .zip) e marca como lidos. */
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
    const res = await api.post(`/companies/${companyId}/documents/download`, { ids }, { responseType: 'blob' })
    const disposition = String(res.headers['content-disposition'] ?? '')
    const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition)
    return { blob: res.data as Blob, fileName: match ? decodeURIComponent(match[1]) : 'documentos.zip' }
  },

  async remove(companyId: string, ids: string[]): Promise<void> {
    if (env.useMocks) {
      const list = mockStore.documents(companyId)
      for (let i = list.length - 1; i >= 0; i--) if (ids.includes(list[i].id)) list.splice(i, 1)
      return mockDelay(undefined, 300)
    }
    await api.delete(`/companies/${companyId}/documents`, { data: { ids } })
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
    input.files.forEach((f) => form.append('files', f))
    if (input.comment) form.append('comment', input.comment)
    if (input.dueDate) form.append('dueDate', input.dueDate)
    await api.post(`/companies/${companyId}/folders/${input.folderId}/documents`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  async send(companyId: string, input: { ids: string[]; message: string }): Promise<void> {
    if (env.useMocks) return mockDelay(undefined, 500)
    await api.post(`/companies/${companyId}/documents/send`, input)
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
