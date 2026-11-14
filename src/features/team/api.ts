import { api } from '@/lib/api'
import { env } from '@/config/env'
import { mockDelay, mockError } from '@/lib/mock'
import type { PagedResult } from '@/types/api'
import type { Department } from '@/types/domain'
import type { DepartamentoDto, PagedDto, PerfilDto } from '@/types/dto'
import { departmentLabels } from '@/features/requests/meta'

/* ---------- Contratos da API (equipe do escritório) ---------- */

interface UsuarioEquipeDto {
  id: string
  nome: string
  email: string
  perfil: PerfilDto
  ativo: boolean
  ultimoLoginEm: string | null
  createdAt: string
  convitePendente: boolean
  conviteEnviadoEm: string | null
  departamentos: DepartamentoDto[]
}

interface DepartamentoEscritorioDto {
  codigo: DepartamentoDto
  nome: string
  ativo: boolean
  colaboradores: number
}

interface ResponsavelEmpresaDto {
  departamento: DepartamentoDto
  departamentoNome: string
  departamentoAtivo: boolean
  usuarioId: string | null
  usuarioNome: string | null
}

/* ---------- Domínio ---------- */

export type TeamRole = 'Admin' | 'Collaborator'

export interface TeamMember {
  id: string
  name: string
  email: string
  role: TeamRole
  active: boolean
  lastLoginAt: string | null
  createdAt: string
  invitePending: boolean
  inviteSentAt: string | null
  departments: Department[]
}

export interface TeamMemberInput {
  name: string
  email: string
  role: TeamRole
  departments: Department[]
}

export interface OfficeDepartment {
  code: Department
  name: string
  active: boolean
  members: number
}

export interface CompanyResponsible {
  department: Department
  departmentName: string
  departmentActive: boolean
  userId: string | null
  userName: string | null
}

export interface TeamFilters {
  search?: string
  department?: Department
  active?: boolean
  page: number
  pageSize: number
}

const ROLE_FROM_API: Record<Exclude<PerfilDto, 'Cliente'>, TeamRole> = { Administrador: 'Admin', Colaborador: 'Collaborator' }
const ROLE_TO_API: Record<TeamRole, PerfilDto> = { Admin: 'Administrador', Collaborator: 'Colaborador' }

const toMember = (d: UsuarioEquipeDto): TeamMember => ({
  id: d.id,
  name: d.nome,
  email: d.email,
  role: ROLE_FROM_API[d.perfil as Exclude<PerfilDto, 'Cliente'>] ?? 'Collaborator',
  active: d.ativo,
  lastLoginAt: d.ultimoLoginEm,
  createdAt: d.createdAt,
  invitePending: d.convitePendente,
  inviteSentAt: d.conviteEnviadoEm,
  departments: d.departamentos,
})

export const teamKeys = {
  all: ['team'] as const,
  list: (f: TeamFilters) => ['team', 'list', f] as const,
  departments: ['team', 'departments'] as const,
  responsibles: (companyId: string) => ['team', 'responsibles', companyId] as const,
}

export const teamApi = {
  async list(f: TeamFilters): Promise<PagedResult<TeamMember>> {
    if (env.useMocks) return mockDelay(mockTeam.page(f), 200)
    const { data } = await api.get<PagedDto<UsuarioEquipeDto>>('/usuarios', {
      params: {
        escritorio: true,
        busca: f.search?.trim() || undefined,
        departamento: f.department,
        ativo: f.active,
        page: f.page,
        pageSize: f.pageSize,
      },
    })
    return { ...data, items: data.items.map(toMember) }
  },

  /** Sem senha: o usuário recebe o convite por e-mail e cria a própria. */
  async invite(input: TeamMemberInput): Promise<TeamMember> {
    if (env.useMocks) return mockDelay(mockTeam.create(input), 300)
    const { data } = await api.post<UsuarioEquipeDto>('/usuarios', {
      nome: input.name.trim(),
      email: input.email.trim(),
      perfil: ROLE_TO_API[input.role],
      departamentos: input.departments,
    })
    return toMember(data)
  },

  async update(member: TeamMember, input: Omit<TeamMemberInput, 'email'>): Promise<TeamMember> {
    if (env.useMocks) return mockDelay(mockTeam.update(member.id, input), 300)
    const { data } = await api.put<UsuarioEquipeDto>(`/usuarios/${member.id}`, {
      nome: input.name.trim(),
      perfil: ROLE_TO_API[input.role],
      ativo: member.active,
      empresaIds: [],
      departamentos: input.departments,
    })
    return toMember(data)
  },

  async setActive(id: string, active: boolean): Promise<TeamMember> {
    if (env.useMocks) return mockDelay(mockTeam.patch(id, { active }), 200)
    const { data } = await api.put<UsuarioEquipeDto>(`/usuarios/${id}/situacao`, { ativo: active })
    return toMember(data)
  },

  async resendInvite(id: string): Promise<void> {
    if (env.useMocks) return mockDelay(undefined, 300)
    await api.post(`/usuarios/${id}/convite`)
  },

  async departments(): Promise<OfficeDepartment[]> {
    if (env.useMocks) return mockDelay(mockTeam.departments(), 150)
    const { data } = await api.get<DepartamentoEscritorioDto[]>('/departamentos')
    return data.map((d) => ({ code: d.codigo, name: d.nome, active: d.ativo, members: d.colaboradores }))
  },

  async updateDepartment(code: Department, input: { name: string; active: boolean }): Promise<void> {
    if (env.useMocks) {
      const d = mockTeam.depts.get(code)!
      Object.assign(d, input)
      return mockDelay(undefined, 200)
    }
    await api.put(`/departamentos/${code}`, { nome: input.name.trim(), ativo: input.active })
  },

  async responsibles(companyId: string): Promise<CompanyResponsible[]> {
    if (env.useMocks) return mockDelay(mockTeam.responsibles(companyId), 150)
    const { data } = await api.get<ResponsavelEmpresaDto[]>(`/empresas/${companyId}/responsaveis`)
    return data.map(toResponsible)
  },

  async setResponsibles(
    companyId: string,
    items: { department: Department; userId: string | null }[],
  ): Promise<CompanyResponsible[]> {
    if (env.useMocks) {
      items.forEach((i) => mockTeam.resp.set(`${companyId}:${i.department}`, i.userId))
      return mockDelay(mockTeam.responsibles(companyId), 200)
    }
    const { data } = await api.put<ResponsavelEmpresaDto[]>(`/empresas/${companyId}/responsaveis`, {
      responsaveis: items.map((i) => ({ departamento: i.department, usuarioId: i.userId })),
    })
    return data.map(toResponsible)
  },
}

const toResponsible = (d: ResponsavelEmpresaDto): CompanyResponsible => ({
  department: d.departamento,
  departmentName: d.departamentoNome,
  departmentActive: d.departamentoAtivo,
  userId: d.usuarioId,
  userName: d.usuarioNome,
})

/* ---------- Mocks (modo sem API) ---------- */

const ALL_DEPTS = Object.keys(departmentLabels) as Department[]

const mockTeam = {
  members: [
    {
      id: 'u-1',
      name: 'Mariana Souza',
      email: 'demo@contix.com.br',
      role: 'Admin',
      active: true,
      lastLoginAt: new Date().toISOString(),
      createdAt: '2025-01-10T12:00:00Z',
      invitePending: false,
      inviteSentAt: null,
      departments: ['Contabil', 'Fiscal'],
    },
    {
      id: 'u-2',
      name: 'Rafael Lima',
      email: 'rafael@exemplo.com.br',
      role: 'Collaborator',
      active: true,
      lastLoginAt: null,
      createdAt: '2025-06-02T12:00:00Z',
      invitePending: true,
      inviteSentAt: '2025-06-02T12:00:00Z',
      departments: ['Pessoal'],
    },
  ] as TeamMember[],
  depts: new Map<Department, OfficeDepartment>(
    ALL_DEPTS.map((d) => [d, { code: d, name: departmentLabels[d], active: true, members: 0 }]),
  ),
  resp: new Map<string, string | null>(),

  page(f: TeamFilters): PagedResult<TeamMember> {
    const term = f.search?.trim().toLowerCase()
    const items = mockTeam.members
      .filter((m) => !term || m.name.toLowerCase().includes(term) || m.email.toLowerCase().includes(term))
      .filter((m) => !f.department || m.departments.includes(f.department))
      .filter((m) => f.active === undefined || m.active === f.active)
    const start = (f.page - 1) * f.pageSize
    return { items: items.slice(start, start + f.pageSize), page: f.page, pageSize: f.pageSize, total: items.length }
  },
  create(input: TeamMemberInput): TeamMember {
    const m: TeamMember = {
      id: crypto.randomUUID(),
      ...input,
      active: true,
      lastLoginAt: null,
      createdAt: new Date().toISOString(),
      invitePending: true,
      inviteSentAt: new Date().toISOString(),
    }
    mockTeam.members.push(m)
    return m
  },
  update(id: string, input: Omit<TeamMemberInput, 'email'>) {
    return mockTeam.patch(id, input)
  },
  patch(id: string, p: Partial<TeamMember>) {
    const m = mockTeam.members.find((x) => x.id === id)
    if (!m) throw mockError(404, 'Usuário não encontrado.')
    return Object.assign(m, p)
  },
  departments: () =>
    ALL_DEPTS.map((d) => ({
      ...mockTeam.depts.get(d)!,
      members: mockTeam.members.filter((m) => m.active && m.departments.includes(d)).length,
    })),
  responsibles: (companyId: string): CompanyResponsible[] =>
    ALL_DEPTS.map((d) => {
      const userId = mockTeam.resp.get(`${companyId}:${d}`) ?? null
      const dept = mockTeam.depts.get(d)!
      return {
        department: d,
        departmentName: dept.name,
        departmentActive: dept.active,
        userId,
        userName: mockTeam.members.find((m) => m.id === userId)?.name ?? null,
      }
    }),
}
