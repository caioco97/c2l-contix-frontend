import type { BadgeTone } from '@/components/ui'
import { TAX_REGIMES } from '@/features/news/meta'
import type { CompanyStatus, HistoryCategory, PortalModule, TaxRegime } from '@/types/domain'

export { TAX_REGIMES }

export const PORTAL_MODULES: { value: PortalModule; label: string; description: string }[] = [
  { value: 'Documentos', label: 'Documentos', description: 'Ver, baixar e enviar documentos (conforme as pastas liberadas).' },
  { value: 'Solicitacoes', label: 'Solicitações', description: 'Abrir e acompanhar solicitações de serviço.' },
  { value: 'NFe', label: 'NF-e', description: 'Manifestação de notas fiscais destinadas.' },
]

export const moduleLabel = (m: PortalModule) => PORTAL_MODULES.find((x) => x.value === m)?.label ?? m

export const COMPANY_STATUSES: { value: CompanyStatus; label: string; tone: BadgeTone }[] = [
  { value: 'Ativa', label: 'Ativa', tone: 'success' },
  { value: 'Inativa', label: 'Inativa', tone: 'neutral' },
  { value: 'Suspensa', label: 'Suspensa', tone: 'warning' },
  { value: 'Baixada', label: 'Baixada', tone: 'danger' },
]

export const HISTORY_CATEGORIES: { value: HistoryCategory; label: string }[] = [
  { value: 'Documento', label: 'Documentos' },
  { value: 'Solicitacao', label: 'Solicitações' },
  { value: 'Certidao', label: 'Certidões' },
  { value: 'Usuario', label: 'Acessos' },
]

export const regimeLabel = (r: TaxRegime) => TAX_REGIMES.find((x) => x.value === r)?.label ?? r
export const statusOf = (s: CompanyStatus) => COMPANY_STATUSES.find((x) => x.value === s) ?? COMPANY_STATUSES[0]
