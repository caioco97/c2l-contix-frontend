import { phoneDigits } from '@/lib/br'
import { api } from '@/lib/api'
import { env } from '@/config/env'
import { mockDelay, mockError } from '@/lib/mock'
import { mockEmployeeList } from '@/mocks/data'
import { mockStore } from '@/mocks/store'
import type {
  Employee,
  EmployeeInput,
  EmployeeLeave,
  EmployeeRecord,
  EmployeeRecordOrigin,
  EmployeeStatus,
  EmployeeVacation,
} from '@/types/domain'
import type { AfastamentoFichaDto, EmpregadoDto, FeriasFichaDto, FichaEmpregadoDto, OrigemFichaDto } from '@/types/dto'
import { STATUS_FROM_API } from '@/features/requests/api'

/* ---------- Conversão DTO (API) <-> domínio ---------- */

function toEmployee(dto: EmpregadoDto): Employee {
  return {
    id: dto.id,
    companyId: dto.empresaId,
    name: dto.nome,
    cpf: dto.cpf,
    registration: dto.matricula,
    role: dto.cargo,
    bond: dto.vinculo,
    status: dto.situacao,
    admissionDate: dto.dataAdmissao,
    terminationDate: dto.dataDesligamento,
    email: dto.email,
    phone: dto.telefone,
    originRequestId: dto.solicitacaoOrigemId,
    createdAt: dto.createdAt,
  }
}

const toOrigin = (o: OrigemFichaDto): EmployeeRecordOrigin => ({
  requestId: o.solicitacaoId,
  number: o.numero,
  typeCode: o.tipo,
  status: STATUS_FROM_API[o.status],
  createdAt: o.createdAt,
})

const toVacation = (f: FeriasFichaDto): EmployeeVacation => ({
  origin: toOrigin(f.origem),
  start: f.inicio,
  end: f.fim,
  days: f.dias,
  accrualStart: f.periodoAquisitivoInicio,
  accrualEnd: f.periodoAquisitivoFim,
  sellTenDays: f.abonoPecuniario,
  advance13th: f.adiantamento13,
})

const toLeave = (a: AfastamentoFichaDto): EmployeeLeave => ({
  origin: toOrigin(a.origem),
  reason: a.motivo,
  start: a.inicio,
  expectedReturn: a.previsaoRetorno,
  notes: a.observacoes,
})

function toRecord(dto: FichaEmpregadoDto): EmployeeRecord {
  return {
    employee: toEmployee(dto.empregado),
    today: {
      vacation: dto.hoje.feriasEmCurso && toVacation(dto.hoje.feriasEmCurso),
      nextVacation: dto.hoje.proximasFerias && toVacation(dto.hoje.proximasFerias),
      leave: dto.hoje.afastamentoEmCurso && toLeave(dto.hoje.afastamentoEmCurso),
    },
    vacations: dto.ferias.map(toVacation),
    leaves: dto.afastamentos.map(toLeave),
    terminations: dto.desligamentos.map((d) => ({
      origin: toOrigin(d.origem),
      kind: d.tipoDesligamento,
      date: d.dataDesligamento,
      notice: d.avisoPrevio,
    })),
    payroll: dto.rubricas.map((r) => ({
      origin: toOrigin(r.origem),
      period: r.competencia,
      item: r.rubrica,
      quantity: r.quantidade,
      amount: r.valor,
    })),
    totalRequests: dto.totalSolicitacoes,
  }
}

const txt = (v: string) => v.trim() || null

function toApi(input: EmployeeInput) {
  return {
    nome: input.name.trim(),
    cpf: txt(input.cpf.replace(/\D/g, '')),
    matricula: txt(input.registration),
    cargo: txt(input.role),
    vinculo: input.bond,
    situacao: input.status,
    dataAdmissao: txt(input.admissionDate),
    dataDesligamento: input.status === 'Desligado' ? txt(input.terminationDate) : null,
    email: txt(input.email),
    telefone: txt(phoneDigits(input.phone)),
  }
}

/** Mapeia as chaves de erro da API para os campos do formulário. */
export const employeeErrorField: Record<string, keyof EmployeeInput> = {
  nome: 'name',
  cpf: 'cpf',
  matricula: 'registration',
  cargo: 'role',
  vinculo: 'bond',
  situacao: 'status',
  dataAdmissao: 'admissionDate',
  dataDesligamento: 'terminationDate',
  email: 'email',
  telefone: 'phone',
}

export interface EmployeeFilters {
  search?: string
  status?: EmployeeStatus
  /** Omite os desligados (o que os formulários de solicitação oferecem). */
  activeOnly?: boolean
}

export const employeeKeys = {
  all: ['employees'] as const,
  list: (companyId: string, f: EmployeeFilters = {}) => ['employees', companyId, f] as const,
  record: (companyId: string, id: string) => ['employees', companyId, 'record', id] as const,
}

export const employeesApi = {
  async list(companyId: string, f: EmployeeFilters = {}): Promise<Employee[]> {
    if (env.useMocks) return mockDelay(mockEmployees.filter(companyId, f), 200)
    const { data } = await api.get<EmpregadoDto[]>(`/empresas/${companyId}/empregados`, {
      params: { busca: f.search?.trim() || undefined, situacao: f.status, ativos: f.activeOnly || undefined },
    })
    return data.map(toEmployee)
  },

  /** Ficha: cadastro, situação de hoje e histórico (férias, afastamentos, desligamento, rubricas). */
  async record(companyId: string, id: string): Promise<EmployeeRecord> {
    if (env.useMocks) {
      const r = mockEmployees.record(companyId, id)
      return r ? mockDelay(r, 250) : mockError(404, 'Empregado não encontrado.')
    }
    const { data } = await api.get<FichaEmpregadoDto>(`/empresas/${companyId}/empregados/${id}/ficha`)
    return toRecord(data)
  },

  async create(companyId: string, input: EmployeeInput): Promise<Employee> {
    if (env.useMocks) return mockEmployees.save(companyId, null, input)
    const { data } = await api.post<EmpregadoDto>(`/empresas/${companyId}/empregados`, toApi(input))
    return toEmployee(data)
  },

  async update(companyId: string, id: string, input: EmployeeInput): Promise<Employee> {
    if (env.useMocks) return mockEmployees.save(companyId, id, input)
    const { data } = await api.put<EmpregadoDto>(`/empresas/${companyId}/empregados/${id}`, toApi(input))
    return toEmployee(data)
  },

  async remove(companyId: string, id: string): Promise<void> {
    if (env.useMocks) {
      mockEmployees.store = mockEmployees.store.filter((e) => e.id !== id)
      return mockDelay(undefined, 300)
    }
    await api.delete(`/empresas/${companyId}/empregados/${id}`)
  },
}

/* ---------- Mocks (modo sem API) ---------- */

export const mockEmployees = {
  store: structuredClone(mockEmployeeList),

  find: (companyId: string, id: string) => mockEmployees.store.find((e) => e.companyId === companyId && e.id === id),

  filter(companyId: string, f: EmployeeFilters) {
    const term = f.search?.trim().toLowerCase()
    return mockEmployees.store
      .filter((e) => e.companyId === companyId)
      .filter((e) => !f.status || e.status === f.status)
      .filter((e) => !f.activeOnly || e.status !== 'Desligado')
      .filter((e) => !term || e.name.toLowerCase().includes(term) || e.cpf?.includes(term) || e.registration?.includes(term))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
  },

  save(companyId: string, id: string | null, input: EmployeeInput): Promise<Employee> {
    const v = toApi(input)
    if (v.cpf && mockEmployees.store.some((e) => e.companyId === companyId && e.cpf === v.cpf && e.id !== id))
      return mockError(409, 'Já existe um empregado com este CPF nesta empresa.')
    const current = id ? mockEmployees.find(companyId, id) : undefined
    const saved: Employee = {
      id: current?.id ?? crypto.randomUUID(),
      companyId,
      name: v.nome,
      cpf: v.cpf,
      registration: v.matricula,
      role: v.cargo,
      bond: v.vinculo,
      status: v.situacao,
      admissionDate: v.dataAdmissao,
      terminationDate: v.dataDesligamento,
      email: v.email,
      phone: v.telefone,
      originRequestId: current?.originRequestId ?? null,
      createdAt: current?.createdAt ?? new Date().toISOString(),
    }
    mockEmployees.store = current ? mockEmployees.store.map((e) => (e.id === id ? saved : e)) : [...mockEmployees.store, saved]
    return mockDelay(saved, 400)
  },

  /** Ficha simplificada a partir das solicitações simuladas. */
  record(companyId: string, id: string): EmployeeRecord | undefined {
    const employee = mockEmployees.find(companyId, id)
    if (!employee) return undefined
    const requests = mockStore.requests(companyId).filter((r) => r.employeeId === id)
    const today = new Date().toISOString().slice(0, 10)
    const vacations: EmployeeVacation[] = requests
      .filter((r) => r.typeCode === 'AvisoFerias' || r.typeCode === 'CalculoFerias')
      .map((r) => {
        const d = r.data as Record<string, string | number | boolean>
        const days = Number(d.dias)
        const end = new Date(new Date(String(d.dataInicio)).getTime() + (days - 1) * 86_400_000).toISOString().slice(0, 10)
        return {
          origin: { requestId: r.id, number: r.number, typeCode: r.typeCode, status: r.status, createdAt: r.createdAt },
          start: String(d.dataInicio),
          end,
          days,
          accrualStart: String(d.periodoAquisitivoInicio),
          accrualEnd: String(d.periodoAquisitivoFim),
          sellTenDays: !!d.abonoPecuniario,
          advance13th: !!d.adiantamento13,
        }
      })
    const valid = vacations.filter((v) => v.origin.status !== 'Canceled')
    return {
      employee,
      today: {
        vacation: valid.find((v) => v.start <= today && v.end >= today) ?? null,
        nextVacation: valid.filter((v) => v.start > today).sort((a, b) => a.start.localeCompare(b.start))[0] ?? null,
        leave: null,
      },
      vacations,
      leaves: [],
      terminations: [],
      payroll: [],
      totalRequests: requests.length,
    }
  },

  /** Como a API: grava o nome do cadastro junto do empregadoId nos dados da solicitação. */
  withNames(companyId: string, data: Record<string, unknown> | undefined): Record<string, unknown> | null {
    if (!data) return null
    const nameOf = (id: unknown) => (typeof id === 'string' ? mockEmployees.find(companyId, id)?.name : undefined)
    const out: Record<string, unknown> = { ...data }
    if (out.empregadoId) out.empregado = nameOf(out.empregadoId)
    if (Array.isArray(out.lancamentos))
      out.lancamentos = (out.lancamentos as Record<string, unknown>[]).map((l) => ({ ...l, empregado: nameOf(l.empregadoId) }))
    return out
  },
}
