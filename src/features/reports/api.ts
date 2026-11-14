import { api } from '@/lib/api'
import { env } from '@/config/env'
import { fetchFile } from '@/lib/download'
import { mockDelay } from '@/lib/mock'
import type { Department } from '@/types/domain'
import type { StatusSolicitacaoDto } from '@/types/dto'

/* ---------- Painel do escritório ---------- */

interface PainelDto {
  de: string
  ate: string
  departamento: Department | null
  clientesAtivos: number
  solicitacoesPorStatus: { status: StatusSolicitacaoDto; total: number }[]
  solicitacoesNoPeriodo: number
  solicitacoesEmAberto: number
  solicitacoesAtrasadas: number
  documentosPublicados: number
  documentosNaoLidos: number
  tarefasNoPeriodo: number
  tarefasConcluidasNoPeriodo: number
  tarefasEmAberto: number
  tarefasAtrasadas: number
  cndsAVencer: number
  cndsVencidas: number
  atualizadoEm: string
}

export interface Dashboard {
  from: string
  until: string
  activeClients: number
  requestsByStatus: { status: StatusSolicitacaoDto; total: number }[]
  requestsInPeriod: number
  openRequests: number
  overdueRequests: number
  documentsPublished: number
  documentsUnread: number
  tasksInPeriod: number
  tasksDoneInPeriod: number
  openTasks: number
  overdueTasks: number
  cndsExpiring: number
  cndsExpired: number
  updatedAt: string
}

export interface DashboardFilters {
  from?: string
  until?: string
  department?: Department
}

/* ---------- Relatórios ---------- */

export type ReportType = 'Documentos' | 'Solicitacoes' | 'Tarefas'
export type ReportFormat = 'Json' | 'Csv' | 'Pdf'

export interface ReportFilters {
  from?: string
  until?: string
  companyId?: string
  assigneeId?: string
  department?: Department
  /** Nome do status na API (StatusSolicitacao ou StatusTarefa). */
  status?: string
}

export interface ReportTable {
  title: string
  subtitle: string
  columns: string[]
  rows: string[][]
  summary: { label: string; value: string }[]
  total: number
  truncated: boolean
  generatedAt: string
}

interface RelatorioTabelaDto {
  titulo: string
  subtitulo: string
  colunas: string[]
  linhas: string[][]
  resumo: { rotulo: string; valor: string }[]
  total: number
  truncado: boolean
  geradoEm: string
}

const toTable = (d: RelatorioTabelaDto): ReportTable => ({
  title: d.titulo,
  subtitle: d.subtitulo,
  columns: d.colunas,
  rows: d.linhas,
  summary: d.resumo.map((r) => ({ label: r.rotulo, value: r.valor })),
  total: d.total,
  truncated: d.truncado,
  generatedAt: d.geradoEm,
})

const toParams = (f: ReportFilters, formato: ReportFormat) => ({
  de: f.from || undefined,
  ate: f.until || undefined,
  empresaId: f.companyId || undefined,
  responsavelId: f.assigneeId || undefined,
  departamento: f.department || undefined,
  status: f.status || undefined,
  formato,
})

const query = (params: Record<string, string | undefined>) =>
  new URLSearchParams(Object.entries(params).filter((e): e is [string, string] => !!e[1])).toString()

export const reportKeys = {
  dashboard: (f: DashboardFilters) => ['reports', 'dashboard', f] as const,
  preview: (type: ReportType, f: ReportFilters) => ['reports', 'preview', type, f] as const,
  company: (companyId: string, f: ReportFilters) => ['reports', 'company', companyId, f] as const,
}

const MOCK_TABLE: ReportTable = {
  title: 'Relatório',
  subtitle: 'Modo de demonstração',
  columns: ['Coluna'],
  rows: [],
  summary: [],
  total: 0,
  truncated: false,
  generatedAt: new Date().toISOString(),
}

export const reportsApi = {
  async dashboard(f: DashboardFilters): Promise<Dashboard> {
    if (env.useMocks)
      return mockDelay({
        from: f.from ?? '',
        until: f.until ?? '',
        activeClients: 2,
        requestsByStatus: [],
        requestsInPeriod: 0,
        openRequests: 0,
        overdueRequests: 0,
        documentsPublished: 0,
        documentsUnread: 0,
        tasksInPeriod: 0,
        tasksDoneInPeriod: 0,
        openTasks: 0,
        overdueTasks: 0,
        cndsExpiring: 0,
        cndsExpired: 0,
        updatedAt: new Date().toISOString(),
      })
    const { data: d } = await api.get<PainelDto>('/painel', {
      params: { de: f.from || undefined, ate: f.until || undefined, departamento: f.department || undefined },
    })
    return {
      from: d.de,
      until: d.ate,
      activeClients: d.clientesAtivos,
      requestsByStatus: d.solicitacoesPorStatus,
      requestsInPeriod: d.solicitacoesNoPeriodo,
      openRequests: d.solicitacoesEmAberto,
      overdueRequests: d.solicitacoesAtrasadas,
      documentsPublished: d.documentosPublicados,
      documentsUnread: d.documentosNaoLidos,
      tasksInPeriod: d.tarefasNoPeriodo,
      tasksDoneInPeriod: d.tarefasConcluidasNoPeriodo,
      openTasks: d.tarefasEmAberto,
      overdueTasks: d.tarefasAtrasadas,
      cndsExpiring: d.cndsAVencer,
      cndsExpired: d.cndsVencidas,
      updatedAt: d.atualizadoEm,
    }
  },

  /** Prévia na tela: até 200 linhas e o resumo. */
  async preview(type: ReportType, f: ReportFilters): Promise<ReportTable> {
    if (env.useMocks) return mockDelay(MOCK_TABLE)
    const { data } = await api.get<RelatorioTabelaDto>(`/relatorios/${type}`, { params: toParams(f, 'Json') })
    return toTable(data)
  },

  /** Arquivo completo (até 20 mil linhas). */
  export(type: ReportType, f: ReportFilters, format: Exclude<ReportFormat, 'Json'>) {
    return fetchFile(`/relatorios/${type}?${query(toParams(f, format))}`, `relatorio.${format.toLowerCase()}`)
  },

  /** Relatório de solicitações da empresa (portal do cliente). */
  async companyPreview(companyId: string, f: ReportFilters): Promise<ReportTable> {
    if (env.useMocks) return mockDelay(MOCK_TABLE)
    const { data } = await api.get<RelatorioTabelaDto>(`/empresas/${companyId}/relatorios/solicitacoes`, {
      params: toParams(f, 'Json'),
    })
    return toTable(data)
  },

  companyExport(companyId: string, f: ReportFilters, format: Exclude<ReportFormat, 'Json'>) {
    return fetchFile(
      `/empresas/${companyId}/relatorios/solicitacoes?${query(toParams(f, format))}`,
      `solicitacoes.${format.toLowerCase()}`,
    )
  },
}
