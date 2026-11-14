import { useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MoreVertical, Search, UserPlus, Users } from 'lucide-react'
import {
  Avatar,
  Badge,
  Button,
  Card,
  ConfirmModal,
  DropdownMenu,
  EmptyState,
  Input,
  MenuItem,
  Select,
  Skeleton,
  Table,
  TBody,
  Tabs,
  Td,
  Th,
  THead,
  Tr,
  useToast,
} from '@/components/ui'
import { useAuth } from '@/features/auth/AuthContext'
import { Pager } from '@/features/requests/components/RequestsTable'
import { requestKeys } from '@/features/requests/api'
import { getErrorMessage } from '@/lib/api'
import { formatDate, formatDateTime } from '@/lib/format'
import { useDebounced } from '@/lib/useDebounced'
import type { Department } from '@/types/domain'
import { teamApi, teamKeys, type TeamFilters, type TeamMember, type TeamMemberInput } from '../api'
import { DepartmentsPanel } from '../components/DepartmentsPanel'
import { MemberFormModal } from '../components/MemberFormModal'

type Tab = 'pessoas' | 'departamentos'
const PAGE_SIZE = 20

/** Equipe do escritório (CTX-31): convites, perfis, departamentos e situação de cada pessoa. */
export function TeamPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'Admin'
  const toast = useToast()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<Tab>('pessoas')
  const [search, setSearch] = useState('')
  const [department, setDepartment] = useState('')
  const [status, setStatus] = useState<'ativos' | 'inativos' | ''>('ativos')
  const [page, setPage] = useState(1)
  const [form, setForm] = useState<{ member: TeamMember | null } | null>(null)
  const [deactivating, setDeactivating] = useState<TeamMember | null>(null)
  const debounced = useDebounced(search)

  const filters: TeamFilters = {
    search: debounced,
    department: (department || undefined) as Department | undefined,
    active: status === '' ? undefined : status === 'ativos',
    page,
    pageSize: PAGE_SIZE,
  }
  const members = useQuery({
    queryKey: teamKeys.list(filters),
    queryFn: () => teamApi.list(filters),
    placeholderData: keepPreviousData,
  })
  const departments = useQuery({ queryKey: teamKeys.departments, queryFn: teamApi.departments, staleTime: 60_000 })
  const deptName = (d: Department) => departments.data?.find((x) => x.code === d)?.name ?? d

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: teamKeys.all })
    queryClient.invalidateQueries({ queryKey: requestKeys.officeUsers })
  }

  const save = useMutation({
    mutationFn: (input: TeamMemberInput) => (form?.member ? teamApi.update(form.member, input) : teamApi.invite(input)),
    onSuccess: (m) => {
      toast.success(form?.member ? 'Dados salvos.' : `Convite enviado para ${m.email}.`)
      invalidate()
      setForm(null)
    },
    onError: (e) => toast.error(getErrorMessage(e, 'Não foi possível salvar.')),
  })

  const setActive = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => teamApi.setActive(id, active),
    onSuccess: (m) => {
      toast.success(m.active ? `${m.name} foi reativado.` : `${m.name} foi desativado.`)
      invalidate()
      setDeactivating(null)
    },
    onError: (e) => toast.error(getErrorMessage(e, 'Não foi possível alterar a situação.')),
  })

  const resend = useMutation({
    mutationFn: (m: TeamMember) => teamApi.resendInvite(m.id),
    onSuccess: (_, m) => {
      toast.success(`Convite reenviado para ${m.email}.`)
      invalidate()
    },
    onError: (e) => toast.error(getErrorMessage(e, 'Não foi possível reenviar o convite.')),
  })

  const reset =
    <T,>(set: (v: T) => void) =>
    (v: T) => {
      set(v)
      setPage(1)
    }
  const items = members.data?.items ?? []

  return (
    <main className="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink">Equipe</h1>
          <p className="text-sm text-slate-500">
            Quem trabalha no escritório, em quais departamentos, e o que cada um pode fazer.
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setForm({ member: null })}>
            <UserPlus className="h-4 w-4" /> Convidar
          </Button>
        )}
      </div>

      <Tabs
        items={[
          { value: 'pessoas', label: 'Pessoas', count: members.data?.total },
          { value: 'departamentos', label: 'Departamentos' },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'departamentos' ? (
        <Card className="overflow-hidden">
          {departments.isLoading ? (
            <Skeleton className="m-4 h-40" />
          ) : (
            <DepartmentsPanel departments={departments.data ?? []} canEdit={isAdmin} />
          )}
        </Card>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-[1.5fr_1fr_1fr]">
            <Input
              aria-label="Buscar por nome ou e-mail"
              placeholder="Nome ou e-mail"
              leftIcon={<Search className="h-4 w-4" />}
              value={search}
              onChange={(e) => reset(setSearch)(e.target.value)}
            />
            <Select
              aria-label="Departamento"
              placeholder="Todos os departamentos"
              value={department}
              onChange={(e) => reset(setDepartment)(e.target.value)}
              options={(departments.data ?? []).map((d) => ({ value: d.code, label: d.name }))}
            />
            <Select
              aria-label="Situação"
              value={status}
              onChange={(e) => reset(setStatus)(e.target.value as typeof status)}
              options={[
                { value: 'ativos', label: 'Ativos' },
                { value: 'inativos', label: 'Inativos' },
                { value: '', label: 'Todos' },
              ]}
            />
          </div>

          <Card className="overflow-hidden">
            {members.isLoading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 4 }, (_, i) => (
                  <Skeleton key={i} className="h-10" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="p-6">
                <EmptyState icon={<Users className="h-8 w-8" />} title="Ninguém encontrado." />
              </div>
            ) : (
              <>
                <Table>
                  <THead>
                    <tr>
                      <Th>Nome</Th>
                      <Th>Perfil</Th>
                      <Th>Departamentos</Th>
                      <Th>Último acesso</Th>
                      {isAdmin && <Th className="w-12" />}
                    </tr>
                  </THead>
                  <TBody>
                    {items.map((m) => (
                      <Tr key={m.id} className={m.active ? undefined : 'opacity-60'}>
                        <Td>
                          <div className="flex items-center gap-3">
                            <Avatar name={m.name} className="h-8 w-8" />
                            <div className="min-w-0">
                              <p className="truncate font-medium text-ink">
                                {m.name} {m.id === user?.id && <span className="text-xs font-normal text-slate-400">(você)</span>}
                              </p>
                              <p className="truncate text-xs text-slate-500">{m.email}</p>
                            </div>
                          </div>
                        </Td>
                        <Td>
                          <div className="flex flex-wrap gap-1">
                            <Badge tone={m.role === 'Admin' ? 'brand' : 'neutral'}>
                              {m.role === 'Admin' ? 'Administrador' : 'Colaborador'}
                            </Badge>
                            {!m.active && <Badge>Inativo</Badge>}
                            {m.active && m.invitePending && <Badge tone="warning">Convite pendente</Badge>}
                          </div>
                        </Td>
                        <Td>
                          {m.departments.length === 0 ? (
                            <span className="text-slate-400">Nenhum</span>
                          ) : (
                            <span className="text-sm">{m.departments.map(deptName).join(', ')}</span>
                          )}
                        </Td>
                        <Td className="whitespace-nowrap text-sm">
                          {m.lastLoginAt
                            ? formatDateTime(m.lastLoginAt)
                            : m.inviteSentAt
                              ? `Convidado em ${formatDate(m.inviteSentAt)}`
                              : 'Nunca entrou'}
                        </Td>
                        {isAdmin && (
                          <Td>
                            <DropdownMenu
                              trigger={({ toggle, open }) => (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  aria-label={`Ações de ${m.name}`}
                                  aria-expanded={open}
                                  onClick={toggle}
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              )}
                            >
                              {(close) => (
                                <>
                                  <MenuItem
                                    onClick={() => {
                                      close()
                                      setForm({ member: m })
                                    }}
                                  >
                                    Editar perfil e departamentos
                                  </MenuItem>
                                  {m.active && m.invitePending && (
                                    <MenuItem
                                      onClick={() => {
                                        close()
                                        resend.mutate(m)
                                      }}
                                    >
                                      Reenviar convite
                                    </MenuItem>
                                  )}
                                  {m.id !== user?.id && (
                                    <MenuItem
                                      onClick={() => {
                                        close()
                                        if (m.active) setDeactivating(m)
                                        else setActive.mutate({ id: m.id, active: true })
                                      }}
                                    >
                                      {m.active ? 'Desativar' : 'Reativar'}
                                    </MenuItem>
                                  )}
                                </>
                              )}
                            </DropdownMenu>
                          </Td>
                        )}
                      </Tr>
                    ))}
                  </TBody>
                </Table>
                <Pager
                  page={page}
                  total={members.data?.total ?? 0}
                  pageSize={PAGE_SIZE}
                  onPage={setPage}
                  noun={['pessoa', 'pessoas']}
                />
              </>
            )}
          </Card>
        </>
      )}

      {form && (
        <MemberFormModal
          key={form.member?.id ?? 'new'}
          open
          member={form?.member ?? null}
          departments={departments.data ?? []}
          saving={save.isPending}
          onClose={() => setForm(null)}
          onSubmit={(input) => save.mutate(input)}
        />
      )}
      <ConfirmModal
        open={!!deactivating}
        title={`Desativar ${deactivating?.name ?? ''}?`}
        description="A pessoa perde o acesso na hora. Tarefas e solicitações atribuídas a ela continuam com o nome dela até serem reatribuídas."
        confirmLabel="Desativar"
        loading={setActive.isPending}
        onConfirm={() => deactivating && setActive.mutate({ id: deactivating.id, active: false })}
        onClose={() => setDeactivating(null)}
      />
    </main>
  )
}
