import { useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MoreVertical, Plus, Search, Users } from 'lucide-react'
import {
  Badge,
  Button,
  Card,
  CardHeader,
  ConfirmModal,
  DropdownMenu,
  EmptyState,
  Input,
  MenuItem,
  Modal,
  Select,
  Skeleton,
  Table,
  TBody,
  Td,
  Th,
  THead,
  Tr,
  useToast,
} from '@/components/ui'
import { requestKeys, requestsApi, type RequestFilters } from '@/features/requests/api'
import { Pager, RequestsTable } from '@/features/requests/components/RequestsTable'
import { getErrorMessage } from '@/lib/api'
import { formatDate } from '@/lib/format'
import type { Employee, EmployeeInput, EmployeeStatus } from '@/types/domain'
import { employeeKeys, employeesApi, type EmployeeFilters } from '../api'
import { STATUS_OPTIONS, bondLabels, formatCpf, statusLabels } from '../meta'
import { EmployeeFormModal } from './EmployeeFormModal'

interface Props {
  companyId: string
  /** Escritório: cadastra, edita e exclui. O cliente só consulta. */
  editable?: boolean
  /** Link de uma solicitação na lista do empregado. */
  requestHref: (requestId: string) => string
}

/** Cadastro de empregados da empresa, com as solicitações de cada um. */
export function EmployeesPanel({ companyId, editable, requestHref }: Props) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<EmployeeStatus | ''>('')
  const [editing, setEditing] = useState<Employee | null | 'new'>(null)
  const [removing, setRemoving] = useState<Employee | null>(null)
  const [viewing, setViewing] = useState<Employee | null>(null)

  const filters: EmployeeFilters = { search: search.trim() || undefined, status: status || undefined }
  const { data = [], isLoading } = useQuery({
    queryKey: employeeKeys.list(companyId, filters),
    queryFn: () => employeesApi.list(companyId, filters),
    placeholderData: keepPreviousData,
  })

  const refresh = () => queryClient.invalidateQueries({ queryKey: employeeKeys.all })

  const save = useMutation({
    mutationFn: (input: EmployeeInput) =>
      editing && editing !== 'new' ? employeesApi.update(companyId, editing.id, input) : employeesApi.create(companyId, input),
    onSuccess: (e) => {
      toast.success(editing === 'new' ? `${e.name} cadastrado(a).` : 'Empregado atualizado.')
      refresh()
      setEditing(null)
    },
    onError: (e) => toast.error(getErrorMessage(e, 'Não foi possível salvar o empregado.')),
  })

  const remove = useMutation({
    mutationFn: (e: Employee) => employeesApi.remove(companyId, e.id),
    onSuccess: () => {
      toast.success('Empregado excluído.')
      refresh()
      setRemoving(null)
    },
    onError: (e) => toast.error(getErrorMessage(e, 'Não foi possível excluir o empregado.')),
  })

  const filtering = !!filters.search || !!filters.status

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader
          className="pb-4"
          title="Empregados"
          action={
            editable && (
              <Button size="sm" onClick={() => setEditing('new')}>
                <Plus className="h-4 w-4" /> Novo empregado
              </Button>
            )
          }
        />
        <div className="flex flex-wrap gap-2 px-4 pb-4">
          <div className="min-w-56 flex-1">
            <Input
              aria-label="Buscar empregado"
              placeholder="Buscar por nome, CPF ou matrícula"
              leftIcon={<Search className="h-4 w-4" />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="w-44">
            <Select
              aria-label="Situação"
              options={STATUS_OPTIONS}
              placeholder="Todas as situações"
              value={status}
              onChange={(e) => setStatus(e.target.value as EmployeeStatus | '')}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        ) : data.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={<Users className="h-8 w-8" />}
              title={filtering ? 'Nenhum empregado encontrado.' : 'Nenhum empregado cadastrado.'}
              description={
                filtering
                  ? undefined
                  : editable
                    ? 'Cadastre os empregados para o cliente escolhê-los nas solicitações de férias, rescisão, afastamento e rubricas.'
                    : 'O escritório cadastra os empregados. Admissões enviadas pela solicitação de cadastro entram aqui quando concluídas.'
              }
              action={editable && !filtering && <Button onClick={() => setEditing('new')}>Cadastrar empregado</Button>}
            />
          </div>
        ) : (
          <Table>
            <THead>
              <tr>
                <Th>Empregado</Th>
                <Th>Cargo</Th>
                <Th>Vínculo</Th>
                <Th>Admissão</Th>
                <Th>Situação</Th>
                <Th>
                  <span className="sr-only">Ações</span>
                </Th>
              </tr>
            </THead>
            <TBody>
              {data.map((e) => (
                <Tr key={e.id}>
                  <Td>
                    <button type="button" className="text-left font-medium text-ink hover:underline" onClick={() => setViewing(e)}>
                      {e.name}
                    </button>
                    <p className="text-xs text-slate-500">
                      {[e.registration && `Matrícula ${e.registration}`, e.cpf ? formatCpf(e.cpf) : 'CPF não informado']
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </Td>
                  <Td className="text-sm">{e.role || '—'}</Td>
                  <Td className="text-xs">{bondLabels[e.bond]}</Td>
                  <Td className="whitespace-nowrap text-xs">{e.admissionDate ? formatDate(e.admissionDate) : '—'}</Td>
                  <Td>
                    <Badge tone={statusLabels[e.status].tone}>{statusLabels[e.status].label}</Badge>
                    {e.terminationDate && <p className="mt-0.5 text-xs text-slate-500">em {formatDate(e.terminationDate)}</p>}
                  </Td>
                  <Td className="text-right">
                    <DropdownMenu
                      trigger={({ toggle }) => (
                        <Button variant="ghost" size="icon" aria-label={`Ações de ${e.name}`} onClick={toggle}>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      )}
                    >
                      {(close) => (
                        <>
                          <MenuItem
                            onClick={() => {
                              close()
                              setViewing(e)
                            }}
                          >
                            Ver solicitações
                          </MenuItem>
                          {editable && (
                            <>
                              <MenuItem
                                onClick={() => {
                                  close()
                                  setEditing(e)
                                }}
                              >
                                Editar
                              </MenuItem>
                              <MenuItem
                                onClick={() => {
                                  close()
                                  setRemoving(e)
                                }}
                              >
                                Excluir
                              </MenuItem>
                            </>
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

      {editable && (
        <EmployeeFormModal
          open={editing !== null}
          employee={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSubmit={(input) => save.mutateAsync(input)}
        />
      )}
      <ConfirmModal
        open={!!removing}
        title="Excluir empregado?"
        description={`${removing?.name} deixa de aparecer nos formulários. As solicitações já abertas continuam com o nome dele. Para quem saiu da empresa, prefira marcar como desligado.`}
        loading={remove.isPending}
        onConfirm={() => removing && remove.mutate(removing)}
        onClose={() => setRemoving(null)}
      />
      <EmployeeRequestsModal
        companyId={companyId}
        employee={viewing}
        office={editable}
        onClose={() => setViewing(null)}
        requestHref={requestHref}
      />
    </>
  )
}

const PAGE = 10

function EmployeeRequestsModal({
  companyId,
  employee,
  office,
  onClose,
  requestHref,
}: {
  companyId: string
  employee: Employee | null
  office?: boolean
  onClose: () => void
  requestHref: (id: string) => string
}) {
  const [page, setPage] = useState(1)
  const f: RequestFilters = { employeeId: employee?.id, sortBy: 'createdAt', sortDesc: true, page, pageSize: PAGE }
  const { data, isLoading } = useQuery({
    queryKey: requestKeys.list(companyId, f),
    queryFn: () => requestsApi.list(companyId, f),
    enabled: !!employee,
  })
  const items = data?.items ?? []

  return (
    <Modal
      open={!!employee}
      onClose={() => {
        setPage(1)
        onClose()
      }}
      title={employee?.name ?? ''}
      description="Solicitações deste empregado, inclusive lançamentos de rubricas em que ele aparece."
      size="lg"
    >
      {isLoading ? (
        <Skeleton className="h-32" />
      ) : items.length === 0 ? (
        <EmptyState title="Nenhuma solicitação para este empregado." />
      ) : (
        <div className="-mx-5">
          <RequestsTable items={items} office={office} hrefOf={(r) => requestHref(r.id)} />
          <Pager page={page} total={data?.total ?? 0} pageSize={PAGE} onPage={setPage} />
        </div>
      )}
    </Modal>
  )
}
