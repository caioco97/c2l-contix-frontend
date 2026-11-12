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

/* ---------- Notícias ---------- */

export interface NewsAttachment {
  id: string
  fileName: string
  sizeBytes: number
}

/** Notícia no portal do cliente. */
export interface NewsItem {
  id: string
  title: string
  summary: string
  publishedAt: string
  isRead: boolean
  hasImage: boolean
  attachmentCount: number
}

export interface NewsDetail extends NewsItem {
  content: string
  attachments: NewsAttachment[]
}

/** Códigos iguais aos da API (SituacaoNoticia / PublicoNoticia / RegimeTributario). */
export type NewsStatus = 'Agendada' | 'Publicada' | 'Expirada'
export type NewsAudience = 'Todos' | 'EmpresasSelecionadas' | 'RegimeTributario'
export type TaxRegime = 'SimplesNacional' | 'LucroPresumido' | 'LucroReal' | 'MEI' | 'Imune' | 'Isento' | 'Outro'

/** Notícia na gestão do escritório, com o alcance. */
export interface OfficeNews {
  id: string
  title: string
  summary: string
  publishAt: string
  expiresAt: string | null
  status: NewsStatus
  audience: NewsAudience
  hasImage: boolean
  attachmentCount: number
  authorName: string
  /** Empresas destinatárias. */
  recipients: number
  /** Empresas em que algum usuário do cliente leu. */
  readers: number
}

export interface OfficeNewsDetail {
  id: string
  title: string
  summary: string | null
  content: string
  publishAt: string
  expiresAt: string | null
  status: NewsStatus
  audience: NewsAudience
  regimes: TaxRegime[]
  companies: { id: string; name: string }[]
  hasImage: boolean
  attachments: NewsAttachment[]
}

export interface NewsReach {
  companyId: string
  companyName: string
  read: boolean
  firstReadAt: string | null
  readers: number
}

export interface NewsInput {
  title: string
  summary?: string
  content: string
  /** ISO; vazio publica agora. */
  publishAt?: string
  expiresAt?: string
  audience: NewsAudience
  companyIds: string[]
  regimes: TaxRegime[]
  image?: File | null
  removeImage?: boolean
  attachments: File[]
  removedAttachmentIds?: string[]
}

/* ---------- Certidões (CND) ---------- */

/** Códigos iguais aos da API (TipoCertidao / SituacaoCertidao). */
export type CndType = 'FederalPgfn' | 'Estadual' | 'Municipal' | 'Fgts' | 'Trabalhista'
export type CndSituation = 'Negativa' | 'PositivaComEfeitoNegativa' | 'Positiva'
/** Situação resumida para exibição. */
export type CndStatus = 'Regular' | 'Irregular' | 'Expiring' | 'Expired'

export interface Cnd {
  id: string
  companyId: string
  companyName: string
  type: CndType
  typeName: string
  situation: CndSituation
  number: string | null
  /** yyyy-MM-dd */
  issuedAt: string
  /** yyyy-MM-dd */
  validUntil: string
  daysToExpire: number
  status: CndStatus
  /** Certidão mais recente do tipo (as demais são histórico). */
  isCurrent: boolean
  notes: string | null
  hasFile: boolean
  fileName: string | null
  sizeBytes: number | null
}

export interface CndDashboard {
  expired: number
  expiring15: number
  expiring30: number
  irregular: number
  items: Cnd[]
}

export interface CndInput {
  type: CndType
  situation: CndSituation
  number?: string
  issuedAt: string
  validUntil: string
  notes?: string
  file?: File | null
  removeFile?: boolean
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
