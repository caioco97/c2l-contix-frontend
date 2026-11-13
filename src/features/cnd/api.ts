import { api } from '@/lib/api'
import { env } from '@/config/env'
import { fetchFile } from '@/lib/download'
import { mockDelay } from '@/lib/mock'
import { mockStore } from '@/mocks/store'
import type { Cnd, CndAutoConfig, CndAutoConfigInput, CndDashboard, CndInput, CndIssue, CndStatus, CndType } from '@/types/domain'
import type { CertidaoDto, ConfiguracaoEmissaoDto, EmissaoCertidaoDto, PainelCertidoesDto } from '@/types/dto'

export const CND_TYPES: { value: CndType; label: string }[] = [
  { value: 'FederalPgfn', label: 'Federal (RFB/PGFN)' },
  { value: 'Estadual', label: 'Estadual' },
  { value: 'Municipal', label: 'Municipal' },
  { value: 'Fgts', label: 'FGTS (CRF)' },
  { value: 'Trabalhista', label: 'Trabalhista (CNDT)' },
]

export const CND_SITUATIONS = [
  { value: 'Negativa', label: 'Negativa' },
  { value: 'PositivaComEfeitoNegativa', label: 'Positiva com efeito de negativa' },
  { value: 'Positiva', label: 'Positiva' },
] as const

export const cndKeys = {
  all: ['cnd'] as const,
  list: (companyId: string, history = false) => ['cnd', companyId, history] as const,
  dashboard: (days: number) => ['cnd', 'dashboard', days] as const,
  autoConfig: (companyId: string) => ['cnd', companyId, 'auto-config'] as const,
  issues: (companyId: string) => ['cnd', companyId, 'issues'] as const,
}

/** Tipos que a emissão automática cobre hoje (os demais variam por UF/município). */
export const AUTO_CND_TYPES: CndType[] = ['FederalPgfn', 'Fgts', 'Trabalhista']

const typeLabel = (type: CndType) => CND_TYPES.find((t) => t.value === type)!.label

function toAutoConfig(dto: ConfiguracaoEmissaoDto): CndAutoConfig {
  return {
    integrationEnabled: dto.integracaoHabilitada,
    provider: dto.provedor,
    supportedTypes: dto.tiposSuportados,
    active: dto.ativa,
    types: dto.tipos,
    daysBefore: dto.diasAntecedencia,
    assigneeId: dto.responsavelId,
    assigneeName: dto.responsavelNome,
  }
}

function toIssue(dto: EmissaoCertidaoDto): CndIssue {
  return {
    id: dto.id,
    type: dto.tipo,
    typeName: dto.tipoNome,
    origin: dto.origem,
    status: dto.status,
    attempts: dto.tentativas,
    nextAttemptAt: dto.proximaTentativaEm,
    createdAt: dto.createdAt,
    finishedAt: dto.concluidaEm,
    provider: dto.provedor,
    message: dto.mensagem,
    requestedBy: dto.solicitadoPorNome,
  }
}

function statusOf(dto: CertidaoDto): CndStatus {
  if (dto.statusValidade === 'Vencida') return 'Expired'
  if (!dto.regular) return 'Irregular'
  if (dto.statusValidade === 'AVencer') return 'Expiring'
  return 'Regular'
}

function toCnd(dto: CertidaoDto): Cnd {
  return {
    id: dto.id,
    companyId: dto.empresaId,
    companyName: dto.empresaNome,
    type: dto.tipo,
    typeName: dto.tipoNome,
    situation: dto.situacao,
    number: dto.numero,
    issuedAt: dto.emissao,
    validUntil: dto.validade,
    daysToExpire: dto.diasParaVencer,
    status: statusOf(dto),
    isCurrent: dto.atual,
    notes: dto.observacao,
    hasFile: dto.possuiArquivo,
    fileName: dto.nomeArquivo,
    sizeBytes: dto.tamanhoBytes,
    autoIssued: dto.emitidaAutomaticamente,
  }
}

function toForm(input: CndInput) {
  const form = new FormData()
  form.append('tipo', input.type)
  form.append('situacao', input.situation)
  if (input.number) form.append('numero', input.number)
  form.append('emissao', input.issuedAt)
  form.append('validade', input.validUntil)
  if (input.notes) form.append('observacao', input.notes)
  if (input.file) form.append('arquivo', input.file)
  if (input.removeFile) form.append('removerArquivo', 'true')
  return form
}

const multipart = { headers: { 'Content-Type': 'multipart/form-data' } }

function mockFromInput(companyId: string, input: CndInput, base?: Cnd): Cnd {
  const days = Math.round((Date.parse(input.validUntil) - Date.now()) / 86_400_000)
  return {
    id: base?.id ?? crypto.randomUUID(),
    companyId,
    companyName: base?.companyName ?? 'Empresa Demo',
    type: input.type,
    typeName: CND_TYPES.find((t) => t.value === input.type)!.label,
    situation: input.situation,
    number: input.number || null,
    issuedAt: input.issuedAt,
    validUntil: input.validUntil,
    daysToExpire: days,
    status: days < 0 ? 'Expired' : input.situation === 'Positiva' ? 'Irregular' : days <= 30 ? 'Expiring' : 'Regular',
    isCurrent: true,
    notes: input.notes || null,
    hasFile: input.removeFile ? !!input.file : !!input.file || !!base?.hasFile,
    fileName: input.file?.name ?? (input.removeFile ? null : (base?.fileName ?? null)),
    sizeBytes: input.file?.size ?? base?.sizeBytes ?? null,
    autoIssued: false,
  }
}

export const cndApi = {
  /** Certidões da empresa: só a atual de cada tipo, ou o histórico completo. */
  async list(companyId: string, history = false): Promise<Cnd[]> {
    if (env.useMocks) return mockDelay(mockStore.cnds(companyId).filter((c) => history || c.isCurrent), 300)
    const { data } = await api.get<CertidaoDto[]>(`/empresas/${companyId}/certidoes`, {
      params: { somenteAtuais: !history },
    })
    return data.map(toCnd)
  },

  async create(companyId: string, input: CndInput): Promise<void> {
    if (env.useMocks) {
      const list = mockStore.cnds(companyId)
      list.forEach((c) => c.type === input.type && (c.isCurrent = false))
      list.unshift(mockFromInput(companyId, input))
      return mockDelay(undefined, 400)
    }
    await api.post(`/empresas/${companyId}/certidoes`, toForm(input), multipart)
  },

  async update(companyId: string, id: string, input: CndInput): Promise<void> {
    if (env.useMocks) {
      const list = mockStore.cnds(companyId)
      const i = list.findIndex((c) => c.id === id)
      list[i] = { ...mockFromInput(companyId, input, list[i]), isCurrent: list[i].isCurrent }
      return mockDelay(undefined, 400)
    }
    await api.put(`/empresas/${companyId}/certidoes/${id}`, toForm(input), multipart)
  },

  async remove(companyId: string, id: string): Promise<void> {
    if (env.useMocks) {
      const list = mockStore.cnds(companyId)
      list.splice(list.findIndex((c) => c.id === id), 1)
      return mockDelay(undefined, 300)
    }
    await api.delete(`/empresas/${companyId}/certidoes/${id}`)
  },

  async download(companyId: string, cnd: Cnd) {
    const fallback = cnd.fileName ?? `${cnd.typeName}.pdf`
    if (env.useMocks) return mockDelay({ blob: new Blob([`Certidão de demonstração: ${cnd.typeName}`]), fileName: fallback }, 300)
    return fetchFile(`/empresas/${companyId}/certidoes/${cnd.id}/download`, fallback)
  },

  /** Configuração da emissão automática da empresa. */
  async autoConfig(companyId: string): Promise<CndAutoConfig> {
    if (env.useMocks) {
      const c = mockStore.cndAuto(companyId)
      return mockDelay({ ...c, integrationEnabled: true, provider: 'Simulado', supportedTypes: AUTO_CND_TYPES, assigneeName: null }, 250)
    }
    const { data } = await api.get<ConfiguracaoEmissaoDto>(`/empresas/${companyId}/certidoes/emissao-automatica`)
    return toAutoConfig(data)
  },

  async saveAutoConfig(companyId: string, input: CndAutoConfigInput): Promise<CndAutoConfig> {
    if (env.useMocks) {
      mockStore.setCndAuto(companyId, input)
      return cndApi.autoConfig(companyId)
    }
    const { data } = await api.put<ConfiguracaoEmissaoDto>(`/empresas/${companyId}/certidoes/emissao-automatica`, {
      ativa: input.active,
      tipos: input.types,
      diasAntecedencia: input.daysBefore,
      responsavelId: input.assigneeId || null,
    })
    return toAutoConfig(data)
  },

  /** Histórico das emissões automáticas (mais recentes primeiro). */
  async issues(companyId: string): Promise<CndIssue[]> {
    if (env.useMocks) return mockDelay([...mockStore.cndIssues(companyId)], 200)
    const { data } = await api.get<EmissaoCertidaoDto[]>(`/empresas/${companyId}/certidoes/emissoes`, { params: { limite: 30 } })
    return data.map(toIssue)
  },

  /** "Emitir agora": coloca na fila (vazio = os tipos configurados). */
  async issueNow(companyId: string, types?: CndType[]): Promise<void> {
    if (env.useMocks) {
      const list = mockStore.cndIssues(companyId)
      const now = new Date().toISOString()
      for (const type of types?.length ? types : mockStore.cndAuto(companyId).types) {
        const valid = new Date(Date.now() + 180 * 86_400_000).toISOString().slice(0, 10)
        const cnds = mockStore.cnds(companyId)
        cnds.forEach((c) => c.type === type && (c.isCurrent = false))
        const cnd = mockFromInput(companyId, { type, situation: 'Negativa', number: '', issuedAt: now.slice(0, 10), validUntil: valid, notes: '' })
        cnds.unshift({ ...cnd, hasFile: true, fileName: `${typeLabel(type)}.pdf`, sizeBytes: 40_000, autoIssued: true })
        list.unshift({
          id: crypto.randomUUID(), type, typeName: typeLabel(type), origin: 'Manual', status: 'Emitida', attempts: 1,
          nextAttemptAt: null, createdAt: now, finishedAt: now, provider: 'Simulado', message: null, requestedBy: 'Você',
        })
      }
      return mockDelay(undefined, 600)
    }
    await api.post(`/empresas/${companyId}/certidoes/emissoes`, { tipos: types ?? [] })
  },

  /** Painel do escritório (todas as empresas). */
  async dashboard(days: number): Promise<CndDashboard> {
    if (env.useMocks) {
      const items = mockStore
        .cnds('c-1')
        .filter((c) => c.isCurrent && (c.daysToExpire <= days || c.situation === 'Positiva'))
        .sort((a, b) => a.validUntil.localeCompare(b.validUntil))
      return mockDelay({
        expired: items.filter((c) => c.daysToExpire < 0).length,
        expiring15: items.filter((c) => c.daysToExpire >= 0 && c.daysToExpire <= 15).length,
        expiring30: items.filter((c) => c.daysToExpire >= 0 && c.daysToExpire <= 30).length,
        irregular: items.filter((c) => c.status === 'Irregular').length,
        items,
      })
    }
    const { data } = await api.get<PainelCertidoesDto>('/certidoes/painel', { params: { dias: days } })
    return {
      expired: data.vencidas,
      expiring15: data.aVencer15Dias,
      expiring30: data.aVencer30Dias,
      irregular: data.irregulares,
      items: data.itens.map(toCnd),
    }
  },
}
