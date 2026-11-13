import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MoreVertical, Users } from 'lucide-react'
import {
  Badge,
  Button,
  Card,
  ConfirmModal,
  DropdownMenu,
  EmptyState,
  MenuItem,
  Skeleton,
  Table,
  TBody,
  Td,
  Th,
  THead,
  Tr,
  useToast,
} from '@/components/ui'
import { getErrorMessage } from '@/lib/api'
import { formatDate, formatDateTime } from '@/lib/format'
import type { PortalPermissions, PortalUser } from '@/types/domain'
import { companiesApi, companyKeys } from '../api'
import { moduleLabel } from '../meta'
import { UserAccessModal } from './UserAccessModal'

interface Props {
  companyId: string
  companyName: string
  /** O convite pode ser aberto pelo cabeçalho da página. */
  inviting: boolean
  onInvitingChange: (v: boolean) => void
}

type Pending = { kind: 'unlink' | 'deactivate'; user: PortalUser } | null

/** Usuários do portal vinculados à empresa: convite, permissões, situação e desvínculo. */
export function CompanyUsersTab({ companyId, companyName, inviting, onInvitingChange }: Props) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<PortalUser | null>(null)
  const [pending, setPending] = useState<Pending>(null)

  const { data = [], isLoading } = useQuery({ queryKey: companyKeys.users(companyId), queryFn: () => companiesApi.users(companyId) })

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: companyKeys.users(companyId) })
    queryClient.invalidateQueries({ queryKey: companyKeys.panel(companyId) })
  }
  const fail = (fallback: string) => (e: unknown) => toast.error(getErrorMessage(e, fallback))

  const invite = useMutation({
    mutationFn: (input: { name: string; email: string } & PortalPermissions) => companiesApi.invite(companyId, input),
    onSuccess: (u) => {
      toast.success(u.invitePending ? `Convite enviado para ${u.email}.` : `${u.name} agora acessa esta empresa.`)
      refresh()
      onInvitingChange(false)
    },
    onError: fail('Não foi possível convidar o usuário.'),
  })

  const save = useMutation({
    mutationFn: ({ userId, p }: { userId: string; p: PortalPermissions }) => companiesApi.updatePermissions(companyId, userId, p),
    onSuccess: () => {
      toast.success('Permissões salvas.')
      refresh()
      setEditing(null)
    },
    onError: fail('Não foi possível salvar as permissões.'),
  })

  const resend = useMutation({
    mutationFn: (u: PortalUser) => companiesApi.resendInvite(u.id),
    onSuccess: (_, u) => toast.success(`Convite reenviado para ${u.email}.`),
    onError: fail('Não foi possível reenviar o convite.'),
  })

  const setActive = useMutation({
    mutationFn: ({ user, active }: { user: PortalUser; active: boolean }) => companiesApi.setActive(user.id, active),
    onSuccess: (_, { active }) => {
      toast.success(active ? 'Usuário reativado.' : 'Usuário inativado.')
      refresh()
      setPending(null)
    },
    onError: fail('Não foi possível alterar a situação do usuário.'),
  })

  const unlink = useMutation({
    mutationFn: (u: PortalUser) => companiesApi.unlink(companyId, u.id),
    onSuccess: () => {
      toast.success('Acesso à empresa removido.')
      refresh()
      setPending(null)
    },
    onError: fail('Não foi possível remover o acesso.'),
  })

  const situation = (u: PortalUser) =>
    !u.active ? <Badge>Inativo</Badge> : u.invitePending ? <Badge tone="warning">Convite pendente</Badge> : <Badge tone="success">Ativo</Badge>

  return (
    <>
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        ) : data.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={<Users className="h-8 w-8" />}
              title="Ninguém da empresa acessa o portal ainda."
              description="Convide as pessoas da empresa para verem documentos, solicitações e certidões."
              action={<Button onClick={() => onInvitingChange(true)}>Convidar usuário</Button>}
            />
          </div>
        ) : (
          <Table>
            <THead>
              <tr>
                <Th>Usuário</Th>
                <Th>Situação</Th>
                <Th>Módulos</Th>
                <Th>Pastas</Th>
                <Th>Último acesso</Th>
                <Th>
                  <span className="sr-only">Ações</span>
                </Th>
              </tr>
            </THead>
            <TBody>
              {data.map((u) => (
                <Tr key={u.id}>
                  <Td>
                    <p className="font-medium text-ink">{u.name}</p>
                    <p className="text-xs text-slate-500">
                      {u.email}
                      {u.otherCompanies > 0 && ` · acessa mais ${u.otherCompanies} empresa(s)`}
                    </p>
                  </Td>
                  <Td>{situation(u)}</Td>
                  <Td className="text-xs">{u.modules.length ? u.modules.map(moduleLabel).join(', ') : 'Nenhum'}</Td>
                  <Td className="text-xs">
                    {!u.modules.includes('Documentos') ? '—' : u.allFolders ? 'Todas' : `${u.folderIds.length} selecionada(s)`}
                  </Td>
                  <Td className="whitespace-nowrap text-xs">
                    {u.lastLoginAt
                      ? formatDateTime(u.lastLoginAt)
                      : u.invitedAt
                        ? `Convidado em ${formatDate(u.invitedAt)}`
                        : 'Nunca'}
                  </Td>
                  <Td className="text-right">
                    <DropdownMenu
                      trigger={({ toggle }) => (
                        <Button variant="ghost" size="icon" aria-label={`Ações de ${u.name}`} onClick={toggle}>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      )}
                    >
                      {(close) => (
                        <>
                          <MenuItem
                            onClick={() => {
                              close()
                              setEditing(u)
                            }}
                          >
                            Editar permissões
                          </MenuItem>
                          {u.active && u.invitePending && (
                            <MenuItem
                              onClick={() => {
                                close()
                                resend.mutate(u)
                              }}
                            >
                              Reenviar convite
                            </MenuItem>
                          )}
                          {u.active ? (
                            <MenuItem
                              onClick={() => {
                                close()
                                setPending({ kind: 'deactivate', user: u })
                              }}
                            >
                              Inativar usuário
                            </MenuItem>
                          ) : (
                            <MenuItem
                              onClick={() => {
                                close()
                                setActive.mutate({ user: u, active: true })
                              }}
                            >
                              Reativar usuário
                            </MenuItem>
                          )}
                          {u.otherCompanies > 0 && (
                            <MenuItem
                              onClick={() => {
                                close()
                                setPending({ kind: 'unlink', user: u })
                              }}
                            >
                              Remover acesso a esta empresa
                            </MenuItem>
                          )}
                        </>
                      )}
                    </DropdownMenu>
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      <UserAccessModal
        key={editing?.id ?? (inviting ? 'novo' : 'fechado')}
        open={inviting || !!editing}
        companyId={companyId}
        companyName={companyName}
        user={editing}
        onClose={() => {
          onInvitingChange(false)
          setEditing(null)
        }}
        onInvite={(input) => invite.mutateAsync(input).then(() => undefined, () => undefined)}
        onSave={(p) => (editing ? save.mutateAsync({ userId: editing.id, p }).then(() => undefined, () => undefined) : Promise.resolve())}
      />

      <ConfirmModal
        open={pending?.kind === 'deactivate'}
        title="Inativar usuário"
        description={`${pending?.user.name} deixa de entrar no portal, inclusive nas outras empresas que acessa. Você pode reativar depois.`}
        confirmLabel="Inativar"
        loading={setActive.isPending}
        onConfirm={() => pending && setActive.mutate({ user: pending.user, active: false })}
        onClose={() => setPending(null)}
      />
      <ConfirmModal
        open={pending?.kind === 'unlink'}
        title="Remover acesso a esta empresa"
        description={`${pending?.user.name} deixa de ver os dados de ${companyName}, mas continua acessando as outras empresas.`}
        confirmLabel="Remover acesso"
        loading={unlink.isPending}
        onConfirm={() => pending && unlink.mutate(pending.user)}
        onClose={() => setPending(null)}
      />
    </>
  )
}
