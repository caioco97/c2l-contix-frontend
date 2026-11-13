/** Manifestação do destinatário (eventos 2102xx da SEFAZ). */
export type NfeManifestation = 'SemManifestacao' | 'Ciencia' | 'Confirmada' | 'Desconhecida' | 'NaoRealizada'
export type NfeStatus = 'Autorizada' | 'Denegada' | 'Cancelada'
export type NfeOrigin = 'ImportacaoXml' | 'Sefaz'

export interface Nfe {
  id: string
  companyId: string
  accessKey: string
  series: number
  number: number
  issuerDocument: string
  issuerName: string
  total: number
  issuedAt: string
  status: NfeStatus
  origin: NfeOrigin
  fullXml: boolean
  hasXml: boolean
  manifestation: NfeManifestation
  manifestedAt: string | null
  manifestedBy: string | null
  autoManifested: boolean
  justification: string | null
  manifestationProtocol: string | null
  sentToSefaz: boolean
}

export interface NfeSummary {
  total: number
  pending: number
  acknowledged: number
  confirmed: number
  unknown: number
  notPerformed: number
}

export interface NfeFilters {
  from?: string
  to?: string
  manifestation?: NfeManifestation | ''
  status?: NfeStatus | ''
  search?: string
  page: number
  pageSize: number
}

export type ImportOutcome = 'Importada' | 'Atualizada' | 'Ignorada' | 'Erro'

export interface ImportResult {
  imported: number
  updated: number
  ignored: number
  errors: number
  files: { file: string; outcome: ImportOutcome; accessKey: string | null; message: string | null }[]
}

export interface Certificate {
  fileName: string
  holder: string
  cnpj: string | null
  issuer: string
  validFrom: string
  validUntil: string
  expired: boolean
  daysToExpire: number
  uploadedAt: string
  uploadedBy: string | null
}

export interface SefazIntegration {
  integrationEnabled: boolean
  provider: string | null
  environment: string | null
  certificate: Certificate | null
  active: boolean
  autoAcknowledge: boolean
  lastNsu: number
  maxNsu: number
  lastQueryAt: string | null
  nextQueryAt: string | null
  lastStatus: string | null
  lastMessage: string | null
  lastQueryFailed: boolean
  documentsReceived: number
  pending: string[]
}

export interface CnpjData {
  cnpj: string
  legalName: string
  tradeName: string | null
  registrationStatus: string | null
  active: boolean
  email: string | null
  phone: string | null
  address: { zip: string; street: string; number: string; complement: string; district: string; city: string; state: string } | null
  suggestedRegime: 'SimplesNacional' | 'MEI' | null
  mainActivity: string | null
  source: string
}
