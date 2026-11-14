import { api } from '@/lib/api'
import { env } from '@/config/env'
import { mockDelay } from '@/lib/mock'
import type { Department, TaxRegime } from '@/types/domain'

/* ---------- Contratos da API ---------- */

export type Periodicity = 'Mensal' | 'Trimestral' | 'Anual'

interface ObrigacaoDto {
  id: string
  titulo: string
  descricao: string | null
  departamento: Department
  periodicidade: Periodicity
  diaVencimento: number
  mesesAposCompetencia: number
  mesReferencia: number
  diasAntecedencia: number
  regimes: TaxRegime[]
  responsavelPadraoId: string | null
  responsavelPadraoNome: string | null
  ativa: boolean
  proximaCompetencia: string | null
  proximoVencimento: string | null
  tarefasGeradas: number
  createdAt: string
}

interface GeracaoTarefasDto {
  competencia: string
  vencimento: string
  empresasAplicaveis: number
  geradas: number
  jaExistentes: number
  semResponsavel: number
}

/* ---------- Domínio ---------- */

export interface Obligation {
  id: string
  title: string
  description: string | null
  department: Department
  periodicity: Periodicity
  dueDay: number
  monthsAfter: number
  referenceMonth: number
  daysAhead: number
  regimes: TaxRegime[]
  defaultAssigneeId: string | null
  defaultAssigneeName: string | null
  active: boolean
  nextPeriod: string | null
  nextDueDate: string | null
  generatedTasks: number
}

export type ObligationInput = Omit<Obligation, 'id' | 'defaultAssigneeName' | 'nextPeriod' | 'nextDueDate' | 'generatedTasks'>

export interface GenerationResult {
  period: string
  dueDate: string
  applicable: number
  created: number
  existing: number
  withoutAssignee: number
}

const toObligation = (d: ObrigacaoDto): Obligation => ({
  id: d.id,
  title: d.titulo,
  description: d.descricao,
  department: d.departamento,
  periodicity: d.periodicidade,
  dueDay: d.diaVencimento,
  monthsAfter: d.mesesAposCompetencia,
  referenceMonth: d.mesReferencia,
  daysAhead: d.diasAntecedencia,
  regimes: d.regimes,
  defaultAssigneeId: d.responsavelPadraoId,
  defaultAssigneeName: d.responsavelPadraoNome,
  active: d.ativa,
  nextPeriod: d.proximaCompetencia,
  nextDueDate: d.proximoVencimento,
  generatedTasks: d.tarefasGeradas,
})

const toBody = (i: ObligationInput) => ({
  titulo: i.title.trim(),
  descricao: i.description?.trim() || null,
  departamento: i.department,
  periodicidade: i.periodicity,
  diaVencimento: i.dueDay,
  mesesAposCompetencia: i.monthsAfter,
  mesReferencia: i.referenceMonth,
  diasAntecedencia: i.daysAhead,
  regimes: i.regimes,
  responsavelPadraoId: i.defaultAssigneeId || null,
  ativa: i.active,
})

export const obligationKeys = { all: ['obligations'] as const }

let mockList: Obligation[] = []

export const obligationsApi = {
  async list(): Promise<Obligation[]> {
    if (env.useMocks) return mockDelay(mockList, 200)
    const { data } = await api.get<ObrigacaoDto[]>('/obrigacoes')
    return data.map(toObligation)
  },

  async create(input: ObligationInput): Promise<Obligation> {
    if (env.useMocks) {
      const o: Obligation = {
        ...input,
        id: crypto.randomUUID(),
        defaultAssigneeName: null,
        nextPeriod: null,
        nextDueDate: null,
        generatedTasks: 0,
      }
      mockList = [...mockList, o]
      return mockDelay(o, 300)
    }
    const { data } = await api.post<ObrigacaoDto>('/obrigacoes', toBody(input))
    return toObligation(data)
  },

  async update(id: string, input: ObligationInput): Promise<Obligation> {
    if (env.useMocks) {
      mockList = mockList.map((o) => (o.id === id ? { ...o, ...input } : o))
      return mockDelay(mockList.find((o) => o.id === id)!, 300)
    }
    const { data } = await api.put<ObrigacaoDto>(`/obrigacoes/${id}`, toBody(input))
    return toObligation(data)
  },

  async remove(id: string): Promise<void> {
    if (env.useMocks) {
      mockList = mockList.filter((o) => o.id !== id)
      return mockDelay(undefined, 200)
    }
    await api.delete(`/obrigacoes/${id}`)
  },

  /** Gera agora as tarefas da competência (idempotente). `period` é yyyy-MM-01. */
  async generate(id: string, period: string): Promise<GenerationResult> {
    if (env.useMocks)
      return mockDelay({ period, dueDate: period, applicable: 0, created: 0, existing: 0, withoutAssignee: 0 }, 400)
    const { data } = await api.post<GeracaoTarefasDto>(`/obrigacoes/${id}/geracoes`, { competencia: period })
    return {
      period: data.competencia,
      dueDate: data.vencimento,
      applicable: data.empresasAplicaveis,
      created: data.geradas,
      existing: data.jaExistentes,
      withoutAssignee: data.semResponsavel,
    }
  },
}

export const PERIODICITY_OPTIONS: { value: Periodicity; label: string }[] = [
  { value: 'Mensal', label: 'Mensal' },
  { value: 'Trimestral', label: 'Trimestral' },
  { value: 'Anual', label: 'Anual' },
]

export const MONTHS = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
]

/** Ex.: "Mensal · vence dia 20 do mês seguinte à competência". */
export function describeSchedule(o: Pick<Obligation, 'periodicity' | 'dueDay' | 'monthsAfter' | 'referenceMonth'>) {
  const after =
    o.monthsAfter === 0
      ? 'do mês da competência'
      : o.monthsAfter === 1
        ? 'do mês seguinte à competência'
        : `${o.monthsAfter} meses após a competência`
  const due = `vence dia ${o.dueDay} ${after}`
  const short = (m: number) => MONTHS[(m - 1 + 12) % 12].slice(0, 3)
  if (o.periodicity === 'Anual') return `Anual (competência de ${MONTHS[o.referenceMonth - 1]}) · ${due}`
  if (o.periodicity === 'Trimestral') {
    const months = [0, 3, 6, 9].map((k) => ((o.referenceMonth - 1 + k) % 12) + 1).sort((a, b) => a - b)
    return `Trimestral (${months.map(short).join(', ')}) · ${due}`
  }
  return `Mensal · ${due}`
}
