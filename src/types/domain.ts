export interface Company {
  id: string
  legalName: string
  tradeName: string
  nickname: string
  document: string
}

export interface DocumentFolder {
  id: string
  name: string
  parentId: string | null
  unreadCount: number
  children?: DocumentFolder[]
}

export interface DocumentItem {
  id: string
  folderId: string
  folderPath: string
  name: string
  comment: string | null
  publishedAt: string
  dueDate: string | null
  addedBy: string
  modifiedAt: string
  sizeBytes: number
  isRead: boolean
}

export type ReadFilter = 'all' | 'unread' | 'read'

export interface NewsItem {
  id: string
  title: string
  summary: string
  publishedAt: string
  isRead: boolean
}

export type CndStatus = 'Regular' | 'Irregular' | 'Expiring' | 'Expired'

export interface Cnd {
  id: string
  type: string
  status: CndStatus
  issuedAt: string
  validUntil: string
}

export type ServiceRequestStatus = 'Open' | 'InAnalysis' | 'WaitingClient' | 'Done' | 'Canceled'

export interface ServiceRequestType {
  id: string
  code: string
  name: string
  group: 'service' | 'nfe'
  description: string
}

export interface ServiceRequest {
  id: string
  number: number
  typeName: string
  subject: string
  department: string
  status: ServiceRequestStatus
  createdAt: string
  updatedAt: string
}

export interface CreateGeneralRequest {
  subject: string
  department: string
  description: string
  attachments: File[]
}
