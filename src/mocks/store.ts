import { formatISO } from 'date-fns'
import type { Cnd, DocumentItem, NewsDetail, OfficeNewsDetail, ServiceRequestDetail } from '@/types/domain'
import { mockCnds, mockDocuments, mockNews, mockRequests } from './data'

/**
 * Estado mutável dos mocks, por empresa, para simular leitura, upload e exclusão
 * durante a sessão. A primeira empresa tem dados; a segunda começa vazia para
 * exercitar os estados vazios.
 */
const documents = new Map<string, DocumentItem[]>([
  ['c-1', structuredClone(mockDocuments)],
  ['c-2', []],
])
const news = new Map<string, NewsDetail[]>([
  ['c-1', structuredClone(mockNews)],
  ['c-2', structuredClone(mockNews).map((n) => ({ ...n, isRead: true }))],
])
const cnds = new Map<string, Cnd[]>([['c-1', structuredClone(mockCnds)]])
const officeNews: OfficeNewsDetail[] = mockNews.map((n) => ({
  id: n.id,
  title: n.title,
  summary: n.summary,
  content: n.content,
  publishAt: n.publishedAt,
  expiresAt: null,
  status: 'Publicada',
  audience: 'Todos',
  regimes: [],
  companies: [],
  hasImage: n.hasImage,
  attachments: n.attachments,
}))
const requests = new Map<string, ServiceRequestDetail[]>([
  ['c-1', structuredClone(mockRequests)],
  ['c-2', []],
])

export const mockStore = {
  documents: (companyId: string) => {
    if (!documents.has(companyId)) documents.set(companyId, [])
    return documents.get(companyId)!
  },
  news: (companyId: string) => {
    if (!news.has(companyId)) news.set(companyId, [])
    return news.get(companyId)!
  },
  cnds: (companyId: string) => {
    if (!cnds.has(companyId)) cnds.set(companyId, [])
    return cnds.get(companyId)!
  },
  officeNews: () => officeNews,
  requests: (companyId: string) => {
    if (!requests.has(companyId)) requests.set(companyId, [])
    return requests.get(companyId)!
  },
  allRequests: () => [...requests.values()].flat(),
  now: () => formatISO(new Date()),
}
