import { api } from '@/lib/api'
import { env } from '@/config/env'
import { fetchFile } from '@/lib/download'
import { mockDelay } from '@/lib/mock'
import { mockStore } from '@/mocks/store'
import type { Cnd, CndDashboard, CndInput, CndStatus, CndType } from '@/types/domain'
import type { CertidaoDto, PainelCertidoesDto } from '@/types/dto'

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
