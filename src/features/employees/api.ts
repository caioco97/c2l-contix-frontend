import { phoneDigits } from '@/lib/br'
import { api } from '@/lib/api'
import { env } from '@/config/env'
import { mockDelay, mockError } from '@/lib/mock'
import { mockEmployeeList } from '@/mocks/data'
import type { Employee, EmployeeInput, EmployeeStatus } from '@/types/domain'
import type { EmpregadoDto } from '@/types/dto'

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
}

export const employeesApi = {
  async list(companyId: string, f: EmployeeFilters = {}): Promise<Employee[]> {
    if (env.useMocks) return mockDelay(mockEmployees.filter(companyId, f), 200)
    const { data } = await api.get<EmpregadoDto[]>(`/empresas/${companyId}/empregados`, {
      params: { busca: f.search?.trim() || undefined, situacao: f.status, ativos: f.activeOnly || undefined },
    })
    return data.map(toEmployee)
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
