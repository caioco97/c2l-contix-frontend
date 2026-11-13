export interface Company {
  id: string
  legalName: string
  tradeName: string
  nickname: string
  document: string
  /** Usuário do cliente: módulos do portal liberados nesta empresa. Ausente para o escritório (acesso total). */
  modules?: PortalModule[] | null
}

/** Módulos do portal do cliente liberados por usuário e empresa (códigos da API). */
export type PortalModule = 'Documentos' | 'Solicitacoes' | 'NFe'

export type CompanyStatus = 'Ativa' | 'Inativa' | 'Suspensa' | 'Baixada'

export interface Address {
  zip: string
  street: string
  number: string
  complement: string
  district: string
  city: string
  state: string
}

/** Empresa na gestão do escritório (lista). */
export interface CompanySummary {
  id: string
  legalName: string
  tradeName: string | null
  nickname: string | null
  document: string
  taxRegime: TaxRegime
  status: CompanyStatus
}

/** Cadastro completo da empresa. */
export interface CompanyDetail extends CompanySummary {
  stateRegistration: string | null
  cityRegistration: string | null
  email: string | null
  phone: string | null
  address: Address | null
  createdAt: string
}

export type CompanyInput = Omit<CompanyDetail, 'id' | 'createdAt'>

/** Indicadores da página da empresa. */
export interface CompanyPanel {
  activeUsers: number
  pendingInvites: number
  documentsNotSeenByClient: number
  receivedUnread: number
  openRequests: number
  overdueRequests: number
  expiredCnds: number
  expiringCnds: number
  openTasks: number
  overdueTasks: number
}

export type HistoryCategory = 'Documento' | 'Solicitacao' | 'Certidao' | 'Usuario'

export interface CompanyHistoryItem {
  id: string
  category: HistoryCategory
  type: string
  at: string
  userName: string | null
  isOffice: boolean | null
  title: string
  detail: string | null
  referenceId: string | null
  folderId: string | null
}

/** Usuário do portal no contexto de uma empresa, com as permissões nela. */
export interface PortalUser {
  id: string
  name: string
  email: string
  active: boolean
  invitePending: boolean
  invitedAt: string | null
  lastLoginAt: string | null
  linkedAt: string
  modules: PortalModule[]
  allFolders: boolean
  folderIds: string[]
  otherCompanies: number
}

export interface PortalPermissions {
  modules: PortalModule[]
  allFolders: boolean
  folderIds: string[]
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
  /** Competência (yyyy-MM-01), quando informada. */
  competence?: string | null
  /** Quem publicou: o escritório (para a empresa) ou a empresa (para o escritório). */
  origin?: DocumentOrigin
  /** Quantos destinatários (o outro lado) já abriram ou baixaram. */
  recipientViews?: number
}

export type DocumentOrigin = 'office' | 'client'

/** Situação de um usuário em relação a um documento. */
export interface DocumentAccess {
  userId: string
  name: string
  email: string
  isOffice: boolean
  viewedAt: string | null
  lastDownloadAt: string | null
  downloads: number
  /** Usuário do lado que deveria ler o documento. */
  isRecipient: boolean
}

export interface DocumentAccessSummary {
  origin: DocumentOrigin
  recipients: number
  recipientsWhoViewed: number
  users: DocumentAccess[]
}

export type DocumentEventType = 'Upload' | 'Visualizacao' | 'Download' | 'Envio' | 'Exclusao'

export interface DocumentEvent {
  id: string
  type: DocumentEventType
  at: string
  userName: string
  isOffice: boolean
  detail: string | null
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
  /** Empregado do cadastro da empresa a que a solicitação se refere (ou que ela gerou). */
  employeeId: string | null
  employeeName: string | null
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

export type NotificationType =
  | 'NewDocument'
  | 'DueSoon'
  | 'NewRequest'
  | 'RequestUpdated'
  | 'NewNews'
  | 'CndExpiring'
  | 'TaskAssigned'

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

/* ---------- Empregados ---------- */

export type EmployeeBond = 'Empregado' | 'Contribuinte' | 'Estagiario'
export type EmployeeStatus = 'Ativo' | 'Afastado' | 'Desligado'

export interface Employee {
  id: string
  companyId: string
  name: string
  /** Somente dígitos. */
  cpf: string | null
  registration: string | null
  role: string | null
  bond: EmployeeBond
  status: EmployeeStatus
  admissionDate: string | null
  terminationDate: string | null
  email: string | null
  phone: string | null
  /** Solicitação de cadastro que originou o registro. */
  originRequestId: string | null
  createdAt: string
}

export interface EmployeeInput {
  name: string
  cpf: string
  registration: string
  role: string
  bond: EmployeeBond
  status: EmployeeStatus
  admissionDate: string
  terminationDate: string
  email: string
  phone: string
}

/* ---------- Tarefas (internas do escritório) ---------- */

export type TaskStatus = 'Pending' | 'InProgress' | 'Done' | 'Canceled'

export interface Task {
  id: string
  number: number
  companyId: string
  companyName: string
  title: string
  department: Department
  status: TaskStatus
  assigneeId: string
  assigneeName: string
  /** Prazo interno (yyyy-MM-dd). */
  internalDueDate: string
  /** Prazo legal da obrigação (yyyy-MM-dd), opcional. */
  legalDueDate: string | null
  /** Prazo interno vencido sem finalizar. */
  isOverdue: boolean
  /** Prazo legal vencido sem finalizar. */
  isLegalOverdue: boolean
  comments: number
  attachments: number
  createdAt: string
  updatedAt: string
}

export interface TaskEvent {
  id: string
  kind: 'created' | 'comment' | 'status' | 'edit'
  message: string | null
  fromStatus: TaskStatus | null
  toStatus: TaskStatus | null
  authorName: string
  createdAt: string
  attachments: RequestAttachment[]
}

export interface TaskDetail extends Task {
  description: string | null
  createdByName: string
  completedAt: string | null
  allowedTransitions: TaskStatus[]
  history: TaskEvent[]
}

export interface TaskInput {
  title: string
  description: string | null
  department: Department
  assigneeId: string
  internalDueDate: string
  legalDueDate: string | null
}

/* ---------- Ficha do empregado ---------- */

export interface EmployeeRecordOrigin {
  requestId: string
  number: number
  typeCode: ServiceRequestTypeCode
  status: ServiceRequestStatus
  createdAt: string
}

export interface EmployeeVacation {
  origin: EmployeeRecordOrigin
  start: string
  end: string
  days: number
  accrualStart: string
  accrualEnd: string
  sellTenDays: boolean
  advance13th: boolean
}

export interface EmployeeLeave {
  origin: EmployeeRecordOrigin
  reason: string
  start: string
  expectedReturn: string | null
  notes: string | null
}

export interface EmployeeTermination {
  origin: EmployeeRecordOrigin
  kind: string
  date: string
  notice: string
}

export interface EmployeePayrollItem {
  origin: EmployeeRecordOrigin
  period: string
  item: string
  quantity: number | null
  amount: number | null
}

export interface EmployeeRecord {
  employee: Employee
  today: { vacation: EmployeeVacation | null; nextVacation: EmployeeVacation | null; leave: EmployeeLeave | null }
  vacations: EmployeeVacation[]
  leaves: EmployeeLeave[]
  terminations: EmployeeTermination[]
  payroll: EmployeePayrollItem[]
  totalRequests: number
}
