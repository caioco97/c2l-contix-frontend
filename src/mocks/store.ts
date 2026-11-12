import { formatISO } from 'date-fns'
import type { DocumentItem, NewsItem } from '@/types/domain'
import { mockDocuments, mockNews, mockRequests } from './data'

/**
 * Estado mutável dos mocks, por empresa, para simular leitura, upload e exclusão
 * durante a sessão. A primeira empresa tem dados; a segunda começa vazia para
 * exercitar os estados vazios.
 */
const documents = new Map<string, DocumentItem[]>([
  ['c-1', structuredClone(mockDocuments)],
  ['c-2', []],
])
const news = new Map<string, NewsItem[]>([
  ['c-1', structuredClone(mockNews)],
  ['c-2', structuredClone(mockNews).map((n) => ({ ...n, isRead: true }))],
])
const requests = new Map([
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
  requests: (companyId: string) => {
    if (!requests.has(companyId)) requests.set(companyId, [])
    return requests.get(companyId)!
  },
  now: () => formatISO(new Date()),
}
