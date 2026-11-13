import { api } from '@/lib/api'
import { env } from '@/config/env'
import { fetchFile } from '@/lib/download'
import { mockDelay, mockError } from '@/lib/mock'
import type { PagedResult } from '@/types/api'
import type {
  CnpjData,
  ImportResult,
  Nfe,
  NfeFilters,
  NfeManifestation,
  NfeSummary,
  SefazIntegration,
} from './types'

/* ---------- DTOs da API ---------- */

interface NotaFiscalDto {
  id: string
  empresaId: string
  chaveAcesso: string
  serie: number
  numero: number
  emitenteDocumento: string
  emitenteNome: string
  valorTotal: number
  dataEmissao: string
  situacao: Nfe['status']
  origem: Nfe['origin']
  xmlCompleto: boolean
  possuiXml: boolean
  manifestacao: NfeManifestation
  manifestadaEm: string | null
  manifestadaPorNome: string | null
  manifestacaoAutomatica: boolean
  justificativaManifestacao: string | null
  protocoloManifestacao: string | null
  manifestacaoEnviadaSefaz: boolean
}

interface IntegracaoSefazDto {
  integracaoHabilitada: boolean
  provedor: string | null
  ambiente: string | null
  certificado: {
    nomeArquivo: string
    titular: string
    cnpj: string | null
    emissor: string
    validoDe: string
    validoAte: string
    vencido: boolean
    diasParaVencer: number
    enviadoEm: string
    enviadoPorNome: string | null
  } | null
  ativa: boolean
  cienciaAutomatica: boolean
  ultimoNsu: number
  maxNsu: number
  ultimaConsultaEm: string | null
  proximaConsultaEm: string | null
  ultimoStatus: string | null
  ultimaMensagem: string | null
  ultimaConsultaFalhou: boolean
  documentosRecebidos: number
  pendencias: string[]
}

interface DadosCnpjDto {
  cnpj: string
  razaoSocial: string
  nomeFantasia: string | null
  situacaoCadastral: string | null
  ativa: boolean
  email: string | null
  telefone: string | null
  endereco: { cep: string | null; logradouro: string | null; numero: string | null; complemento: string | null; bairro: string | null; cidade: string | null; uf: string | null } | null
  regimeSugerido: CnpjData['suggestedRegime']
  atividadePrincipal: string | null
  fonte: string
}

const toNfe = (d: NotaFiscalDto): Nfe => ({
  id: d.id,
  companyId: d.empresaId,
  accessKey: d.chaveAcesso,
  series: d.serie,
  number: d.numero,
  issuerDocument: d.emitenteDocumento,
  issuerName: d.emitenteNome,
  total: d.valorTotal,
  issuedAt: d.dataEmissao,
  status: d.situacao,
  origin: d.origem,
  fullXml: d.xmlCompleto,
  hasXml: d.possuiXml,
  manifestation: d.manifestacao,
  manifestedAt: d.manifestadaEm,
  manifestedBy: d.manifestadaPorNome,
  autoManifested: d.manifestacaoAutomatica,
  justification: d.justificativaManifestacao,
  manifestationProtocol: d.protocoloManifestacao,
  sentToSefaz: d.manifestacaoEnviadaSefaz,
})

const toIntegration = (d: IntegracaoSefazDto): SefazIntegration => ({
  integrationEnabled: d.integracaoHabilitada,
  provider: d.provedor,
  environment: d.ambiente,
  certificate: d.certificado && {
    fileName: d.certificado.nomeArquivo,
    holder: d.certificado.titular,
    cnpj: d.certificado.cnpj,
    issuer: d.certificado.emissor,
    validFrom: d.certificado.validoDe,
    validUntil: d.certificado.validoAte,
    expired: d.certificado.vencido,
    daysToExpire: d.certificado.diasParaVencer,
    uploadedAt: d.certificado.enviadoEm,
    uploadedBy: d.certificado.enviadoPorNome,
  },
  active: d.ativa,
  autoAcknowledge: d.cienciaAutomatica,
  lastNsu: d.ultimoNsu,
  maxNsu: d.maxNsu,
  lastQueryAt: d.ultimaConsultaEm,
  nextQueryAt: d.proximaConsultaEm,
  lastStatus: d.ultimoStatus,
  lastMessage: d.ultimaMensagem,
  lastQueryFailed: d.ultimaConsultaFalhou,
  documentsReceived: d.documentosRecebidos,
  pending: d.pendencias,
})

const toCnpj = (d: DadosCnpjDto): CnpjData => ({
  cnpj: d.cnpj,
  legalName: d.razaoSocial,
  tradeName: d.nomeFantasia,
  registrationStatus: d.situacaoCadastral,
  active: d.ativa,
  email: d.email,
  phone: d.telefone,
  address: d.endereco && {
    zip: d.endereco.cep ?? '',
    street: d.endereco.logradouro ?? '',
    number: d.endereco.numero ?? '',
    complement: d.endereco.complemento ?? '',
    district: d.endereco.bairro ?? '',
    city: d.endereco.cidade ?? '',
    state: d.endereco.uf ?? '',
  },
  suggestedRegime: d.regimeSugerido,
  mainActivity: d.atividadePrincipal,
  source: d.fonte,
})

export const nfeKeys = {
  all: ['nfe'] as const,
  list: (companyId: string, f: NfeFilters) => ['nfe', companyId, 'list', f] as const,
  summary: (companyId: string) => ['nfe', companyId, 'summary'] as const,
  sefaz: (companyId: string) => ['nfe', companyId, 'sefaz'] as const,
}

const multipart = { headers: { 'Content-Type': 'multipart/form-data' } }

/* ---------- Mocks (VITE_USE_MOCKS) ---------- */

const mockNotes = new Map<string, Nfe[]>()
const mockSefaz = new Map<string, SefazIntegration>()

function mockList(companyId: string): Nfe[] {
  if (!mockNotes.has(companyId)) {
    const base = Date.now()
    const issuers = [
      ['Distribuidora Aurora de Papelaria Ltda', '12345678000195', 1234.56, 'SemManifestacao'],
      ['Tech Supply Informática S.A.', '98765432000110', 8900, 'Ciencia'],
      ['Atacado Bom Preço Ltda', '11222333000181', 456.1, 'Confirmada'],
      ['Transportes Rápido Sul Ltda', '44555666000181', 320, 'SemManifestacao'],
    ] as const
    mockNotes.set(
      companyId,
      issuers.map(([name, doc, total, manifestation], i) => ({
        id: crypto.randomUUID(),
        companyId,
        accessKey: `3526${String(10 - i).padStart(2, '0')}${doc}55001${String(1000 + i).padStart(9, '0')}1${String(12345678 + i)}${i}`,
        series: 1,
        number: 1000 + i,
        issuerDocument: doc,
        issuerName: name,
        total,
        issuedAt: new Date(base - (i * 4 + 1) * 86_400_000).toISOString(),
        status: 'Autorizada',
        origin: i % 2 ? 'ImportacaoXml' : 'Sefaz',
        fullXml: manifestation !== 'SemManifestacao',
        hasXml: true,
        manifestation,
        manifestedAt: manifestation === 'SemManifestacao' ? null : new Date(base - i * 86_400_000).toISOString(),
        manifestedBy: manifestation === 'Confirmada' ? 'Cliente Demo' : null,
        autoManifested: manifestation === 'Ciencia',
        justification: null,
        manifestationProtocol: manifestation === 'SemManifestacao' ? null : '891260000000123',
        sentToSefaz: manifestation !== 'SemManifestacao',
      })),
    )
  }
  return mockNotes.get(companyId)!
}

function mockIntegration(companyId: string): SefazIntegration {
  if (!mockSefaz.has(companyId))
    mockSefaz.set(companyId, {
      integrationEnabled: true, provider: 'Simulado', environment: 'Homologacao', certificate: null, active: false,
      autoAcknowledge: true, lastNsu: 0, maxNsu: 0, lastQueryAt: null, nextQueryAt: null, lastStatus: null,
      lastMessage: null, lastQueryFailed: false, documentsReceived: 0, pending: ['Envie o certificado digital A1 da empresa.'],
    })
  return mockSefaz.get(companyId)!
}

/* ---------- API ---------- */

export const nfeApi = {
  async list(companyId: string, f: NfeFilters): Promise<PagedResult<Nfe>> {
    if (env.useMocks) {
      const term = (f.search ?? '').toLowerCase()
      const items = mockList(companyId).filter(
        (n) =>
          (!f.manifestation || n.manifestation === f.manifestation) &&
          (!f.status || n.status === f.status) &&
          (!f.from || n.issuedAt.slice(0, 10) >= f.from) &&
          (!f.to || n.issuedAt.slice(0, 10) <= f.to) &&
          (!term || n.issuerName.toLowerCase().includes(term) || n.accessKey.includes(term) || n.issuerDocument.includes(term)),
      )
      return mockDelay({ items: items.slice((f.page - 1) * f.pageSize, f.page * f.pageSize), page: f.page, pageSize: f.pageSize, total: items.length })
    }
    const { data } = await api.get<PagedResult<NotaFiscalDto>>(`/empresas/${companyId}/notas-fiscais`, {
      params: {
        de: f.from || undefined,
        ate: f.to || undefined,
        manifestacao: f.manifestation || undefined,
        situacao: f.status || undefined,
        busca: f.search || undefined,
        page: f.page,
        pageSize: f.pageSize,
      },
    })
    return { ...data, items: data.items.map(toNfe) }
  },

  async summary(companyId: string): Promise<NfeSummary> {
    if (env.useMocks) {
      const l = mockList(companyId).filter((n) => n.status !== 'Cancelada')
      const c = (m: NfeManifestation) => l.filter((n) => n.manifestation === m).length
      return mockDelay({ total: l.length, pending: c('SemManifestacao'), acknowledged: c('Ciencia'), confirmed: c('Confirmada'), unknown: c('Desconhecida'), notPerformed: c('NaoRealizada') }, 200)
    }
    const { data } = await api.get(`/empresas/${companyId}/notas-fiscais/resumo`)
    return {
      total: data.total,
      pending: data.semManifestacao,
      acknowledged: data.ciencia,
      confirmed: data.confirmadas,
      unknown: data.desconhecidas,
      notPerformed: data.naoRealizadas,
    }
  },

  async manifest(companyId: string, id: string, type: Exclude<NfeManifestation, 'SemManifestacao'>, justification?: string): Promise<Nfe> {
    if (env.useMocks) {
      const n = mockList(companyId).find((x) => x.id === id)!
      if (type === 'NaoRealizada' && (justification?.trim().length ?? 0) < 15)
        return mockError(400, 'A justificativa deve ter de 15 a 255 caracteres.')
      Object.assign(n, {
        manifestation: type, manifestedAt: new Date().toISOString(), manifestedBy: 'Você', autoManifested: false,
        justification: type === 'NaoRealizada' ? justification!.trim() : null, fullXml: true,
        manifestationProtocol: mockIntegration(companyId).certificate ? '891260000000999' : null,
        sentToSefaz: !!mockIntegration(companyId).certificate,
      })
      return mockDelay(n, 500)
    }
    const { data } = await api.post<NotaFiscalDto>(`/empresas/${companyId}/notas-fiscais/${id}/manifestacao`, {
      tipo: type,
      justificativa: justification || null,
    })
    return toNfe(data)
  },

  async downloadXml(companyId: string, n: Nfe) {
    const fallback = `${n.accessKey}.xml`
    if (env.useMocks) return mockDelay({ blob: new Blob([`<nfeProc><chNFe>${n.accessKey}</chNFe></nfeProc>`]), fileName: fallback }, 200)
    return fetchFile(`/empresas/${companyId}/notas-fiscais/${n.id}/xml`, fallback)
  },

  async importXml(companyId: string, files: File[]): Promise<ImportResult> {
    if (env.useMocks)
      return mockDelay({
        imported: files.length, updated: 0, ignored: 0, errors: 0,
        files: files.map((f) => ({ file: f.name, outcome: 'Importada' as const, accessKey: null, message: null })),
      }, 600)
    const form = new FormData()
    files.forEach((f) => form.append('arquivos', f))
    const { data } = await api.post(`/empresas/${companyId}/notas-fiscais/importacao`, form, multipart)
    return {
      imported: data.importadas,
      updated: data.atualizadas,
      ignored: data.ignoradas,
      errors: data.erros,
      files: data.arquivos.map((a: { arquivo: string; resultado: ImportResult['files'][number]['outcome']; chaveAcesso: string | null; mensagem: string | null }) => ({
        file: a.arquivo, outcome: a.resultado, accessKey: a.chaveAcesso, message: a.mensagem,
      })),
    }
  },

  async sefaz(companyId: string): Promise<SefazIntegration> {
    if (env.useMocks) return mockDelay(mockIntegration(companyId), 250)
    const { data } = await api.get<IntegracaoSefazDto>(`/empresas/${companyId}/integracao-sefaz`)
    return toIntegration(data)
  },

  async saveSefaz(companyId: string, input: { active: boolean; autoAcknowledge: boolean }): Promise<SefazIntegration> {
    if (env.useMocks) {
      const s = mockIntegration(companyId)
      if (input.active && s.pending.length) return mockError(400, s.pending[0])
      Object.assign(s, { active: input.active, autoAcknowledge: input.autoAcknowledge, nextQueryAt: input.active ? new Date().toISOString() : null })
      return mockDelay(s, 300)
    }
    const { data } = await api.put<IntegracaoSefazDto>(`/empresas/${companyId}/integracao-sefaz`, {
      ativa: input.active,
      cienciaAutomatica: input.autoAcknowledge,
    })
    return toIntegration(data)
  },

  async uploadCertificate(companyId: string, file: File, password: string): Promise<SefazIntegration> {
    if (env.useMocks) {
      const s = mockIntegration(companyId)
      const until = new Date(Date.now() + 300 * 86_400_000).toISOString()
      s.certificate = {
        fileName: file.name, holder: 'EMPRESA DEMONSTRACAO LTDA', cnpj: '44555666000181', issuer: 'AC Simulada',
        validFrom: new Date().toISOString(), validUntil: until, expired: false, daysToExpire: 300,
        uploadedAt: new Date().toISOString(), uploadedBy: 'Você',
      }
      s.pending = []
      return mockDelay(s, 600)
    }
    const form = new FormData()
    form.append('arquivo', file)
    form.append('senha', password)
    const { data } = await api.post<IntegracaoSefazDto>(`/empresas/${companyId}/integracao-sefaz/certificado`, form, multipart)
    return toIntegration(data)
  },

  async removeCertificate(companyId: string): Promise<SefazIntegration> {
    if (env.useMocks) {
      const s = mockIntegration(companyId)
      Object.assign(s, { certificate: null, active: false, pending: ['Envie o certificado digital A1 da empresa.'] })
      return mockDelay(s, 300)
    }
    const { data } = await api.delete<IntegracaoSefazDto>(`/empresas/${companyId}/integracao-sefaz/certificado`)
    return toIntegration(data)
  },

  async syncNow(companyId: string): Promise<SefazIntegration> {
    if (env.useMocks) {
      const s = mockIntegration(companyId)
      Object.assign(s, { lastQueryAt: new Date().toISOString(), lastStatus: '138', lastMessage: 'Documento(s) localizado(s)', lastNsu: s.lastNsu + 3, maxNsu: s.lastNsu + 3, documentsReceived: s.documentsReceived + 3 })
      return mockDelay(s, 500)
    }
    const { data } = await api.post<IntegracaoSefazDto>(`/empresas/${companyId}/integracao-sefaz/sincronizacoes`)
    return toIntegration(data)
  },

  /** Dados públicos do CNPJ (Receita Federal) para preencher o cadastro. */
  async lookupCnpj(cnpj: string): Promise<CnpjData> {
    if (env.useMocks)
      return mockDelay({
        cnpj, legalName: `Empresa ${cnpj.slice(0, 4)} Comércio Ltda`, tradeName: 'Empresa Exemplo', registrationStatus: 'Ativa',
        active: true, email: 'contato@exemplo.com.br', phone: '1133334444',
        address: { zip: '01310100', street: 'Avenida Paulista', number: '1000', complement: '', district: 'Bela Vista', city: 'São Paulo', state: 'SP' },
        suggestedRegime: 'SimplesNacional', mainActivity: 'Comércio varejista', source: 'Simulado',
      }, 500)
    const { data } = await api.get<DadosCnpjDto>(`/consulta-cnpj/${cnpj}`)
    return toCnpj(data)
  },
}
