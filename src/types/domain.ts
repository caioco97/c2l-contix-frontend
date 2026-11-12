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
  /** O cliente pode enviar arquivos para esta pasta. */
  clientCanUpload?: boolean
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

/** Documento com vencimento, exibido no calendário. */
export interface DueDocument {
  id: string
  name: string
  /** yyyy-MM-dd */
  dueDate: string
  folderId: string
  folderPath: string
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

/** Códigos dos tipos, iguais aos da API (TipoSolicitacao). */
export type ServiceRequestTypeCode =
  | 'Geral'
  | 'CadastroEmpregado'
  | 'CadastroContribuinte'
  | 'CadastroEstagiario'
  | 'AvisoFerias'
  | 'CalculoFerias'
  | 'AvisoRescisao'
  | 'CalculoRescisao'
  | 'Afastamento'
  | 'LancamentoRubricas'

/** Departamentos, com os mesmos valores da API. */
export type Department = 'Contabil' | 'Fiscal' | 'Pessoal' | 'Societario' | 'Financeiro'

export interface ServiceRequestType {
  code: ServiceRequestTypeCode
  name: string
  description: string
  department: Department
  deadlineDays: number
  requiresAttachment: boolean
  attachmentHint: string | null
}

export interface ServiceRequest {
  id: string
  number: number
  companyId: string
  companyName: string
  typeCode: ServiceRequestTypeCode
  typeName: string
  subject: string
  department: Department
  status: ServiceRequestStatus
  requesterName: string
  assigneeId: string | null
  assigneeName: string | null
  dueDate: string | null
  isOverdue: boolean
  createdAt: string
  updatedAt: string
}

export interface RequestAttachment {
  id: string
  fileName: string
  sizeBytes: number
  uploadedBy: string
  createdAt: string
}

export type RequestEventKind = 'opened' | 'comment' | 'status' | 'assignment'

export interface RequestEvent {
  id: string
  kind: RequestEventKind
  message: string | null
  fromStatus: ServiceRequestStatus | null
  toStatus: ServiceRequestStatus | null
  authorName: string
  authorIsOffice: boolean
  createdAt: string
  attachments: RequestAttachment[]
}

export interface ServiceRequestDetail extends ServiceRequest {
  description: string | null
  /** Campos específicos do tipo, como a API devolve (camelCase). */
  data: Record<string, unknown> | null
  closedAt: string | null
  allowedTransitions: ServiceRequestStatus[]
  history: RequestEvent[]
}

export interface OfficeUser {
  id: string
  name: string
}

/* ---------- Notificações ---------- */

export type NotificationType = 'NewDocument' | 'DueSoon' | 'NewRequest' | 'RequestUpdated'

export interface AppNotification {
  id: string
  type: NotificationType
  title: string
  message: string
  /** Rota do app para abrir o item (ex.: /documentos/{pastaId}). */
  link: string | null
  /** Empresa do item: o app troca a empresa ativa antes de navegar. */
  companyId: string | null
  isRead: boolean
  createdAt: string
}

export interface NotificationPreference {
  type: NotificationType
  label: string
  email: boolean
}
