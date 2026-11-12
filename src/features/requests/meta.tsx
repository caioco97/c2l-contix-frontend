import {
  Briefcase,
  Calculator,
  CalendarClock,
  ClipboardList,
  FileBarChart2,
  FileSignature,
  FileX2,
  GraduationCap,
  HeartPulse,
  UserPlus,
  type LucideIcon,
} from 'lucide-react'
import type { Department, ServiceRequestStatus, ServiceRequestTypeCode } from '@/types/domain'

export const requestIcons: Record<ServiceRequestTypeCode, LucideIcon> = {
  Geral: ClipboardList,
  CadastroEmpregado: UserPlus,
  CadastroContribuinte: Briefcase,
  CadastroEstagiario: GraduationCap,
  AvisoFerias: CalendarClock,
  CalculoFerias: Calculator,
  AvisoRescisao: FileX2,
  CalculoRescisao: FileBarChart2,
  Afastamento: HeartPulse,
  LancamentoRubricas: FileSignature,
}

type Tone = 'info' | 'warning' | 'success' | 'neutral' | 'brand'

/** Rótulos do status. "WaitingClient" muda conforme quem vê: o cliente lê "Aguardando você". */
export const statusMeta: Record<ServiceRequestStatus, { label: string; officeLabel: string; tone: Tone }> = {
  Open: { label: 'Aberta', officeLabel: 'Aberta', tone: 'info' },
  InAnalysis: { label: 'Em análise', officeLabel: 'Em análise', tone: 'brand' },
  WaitingClient: { label: 'Aguardando você', officeLabel: 'Aguardando cliente', tone: 'warning' },
  Done: { label: 'Concluída', officeLabel: 'Concluída', tone: 'success' },
  Canceled: { label: 'Cancelada', officeLabel: 'Cancelada', tone: 'neutral' },
}

export const STATUS_OPTIONS = (Object.keys(statusMeta) as ServiceRequestStatus[]).map((s) => ({
  value: s,
  label: statusMeta[s].officeLabel,
}))

export const departmentLabels: Record<Department, string> = {
  Contabil: 'Contábil',
  Fiscal: 'Fiscal',
  Pessoal: 'Pessoal',
  Societario: 'Societário',
  Financeiro: 'Financeiro',
}

export const DEPARTMENTS = (Object.keys(departmentLabels) as Department[]).map((d) => ({
  value: d,
  label: departmentLabels[d],
}))

/** Ações de status do escritório, na ordem em que aparecem. */
export const statusActions: Record<ServiceRequestStatus, { label: string; needsMessage?: boolean; danger?: boolean }> = {
  InAnalysis: { label: 'Iniciar análise' },
  WaitingClient: { label: 'Pedir informação ao cliente', needsMessage: true },
  Done: { label: 'Concluir' },
  Canceled: { label: 'Cancelar', danger: true },
  Open: { label: 'Reabrir' },
}

/* ---------- Campos específicos (dados) para exibição ---------- */

export const dataLabels: Record<string, string> = {
  nome: 'Nome',
  cpf: 'CPF',
  rg: 'RG',
  pis: 'PIS',
  dataNascimento: 'Data de nascimento',
  email: 'E-mail',
  telefone: 'Telefone',
  endereco: 'Endereço',
  cargo: 'Cargo / função',
  salario: 'Salário / valor',
  jornada: 'Jornada',
  dataAdmissao: 'Admissão / início',
  instituicaoEnsino: 'Instituição de ensino',
  curso: 'Curso',
  dataTerminoEstagio: 'Término do estágio',
  empregado: 'Empregado',
  periodoAquisitivoInicio: 'Período aquisitivo (início)',
  periodoAquisitivoFim: 'Período aquisitivo (fim)',
  dataInicio: 'Início',
  dias: 'Dias',
  abonoPecuniario: 'Abono pecuniário',
  adiantamento13: 'Adiantamento do 13º',
  tipoDesligamento: 'Tipo de desligamento',
  dataDesligamento: 'Data do desligamento',
  avisoPrevio: 'Aviso prévio',
  observacoes: 'Observações',
  motivo: 'Motivo',
  previsaoRetorno: 'Previsão de retorno',
  competencia: 'Competência',
  lancamentos: 'Lançamentos',
}

export const enumLabels: Record<string, string> = {
  SemJustaCausa: 'Dispensa sem justa causa',
  ComJustaCausa: 'Dispensa com justa causa',
  PedidoDemissao: 'Pedido de demissão',
  AcordoMutuo: 'Acordo entre as partes',
  TerminoContrato: 'Término de contrato',
  Trabalhado: 'Trabalhado',
  Indenizado: 'Indenizado',
  Dispensado: 'Dispensado',
  Doenca: 'Doença',
  AcidenteTrabalho: 'Acidente de trabalho',
  LicencaMaternidade: 'Licença-maternidade',
  LicencaPaternidade: 'Licença-paternidade',
  ServicoMilitar: 'Serviço militar',
  Outros: 'Outros',
}

export const optionsOf = (...keys: string[]) => keys.map((k) => ({ value: k, label: enumLabels[k] ?? k }))
