import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { CalendarClock, MoreVertical, Plus } from 'lucide-react'
import {
  Badge,
  Button,
  Card,
  ConfirmModal,
  DropdownMenu,
  EmptyState,
  FormField,
  Input,
  MenuItem,
  Modal,
  Skeleton,
  Table,
  TBody,
  Td,
  Th,
  THead,
  Tr,
  useToast,
} from '@/components/ui'
import { useAuth } from '@/features/auth/AuthContext'
import { departmentLabels } from '@/features/requests/meta'
import { regimeLabel } from '@/features/companies/meta'
import { taskKeys } from '@/features/tasks/api'
import { getErrorMessage } from '@/lib/api'
import { formatDate } from '@/lib/format'
import { describeSchedule, obligationKeys, obligationsApi, type Obligation, type ObligationInput } from './api'
import { ObligationFormModal } from './components/ObligationFormModal'

const thisMonth = () => new Date().toISOString().slice(0, 7)

/** Obrigações recorrentes do escritório: modelos que viram tarefas por empresa a cada competência. */
export function ObligationsPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'Admin'
  const toast = useToast()
  const queryClient = useQueryClient()
  const [form, setForm] = useState<{ obligation: Obligation | null } | null>(null)
  const [removing, setRemoving] = useState<Obligation | null>(null)
  const [generating, setGenerating] = useState<Obligation | null>(null)
  const [period, setPeriod] = useState(thisMonth())

  const list = useQuery({ queryKey: obligationKeys.all, queryFn: obligationsApi.list })

  const save = useMutation({
    mutationFn: (input: ObligationInput) =>
      form?.obligation ? obligationsApi.update(form.obligation.id, input) : obligationsApi.create(input),
    onSuccess: () => {
      toast.success('Obrigação salva. As tarefas dos próximos vencimentos são criadas automaticamente.')
      queryClient.invalidateQueries({ queryKey: obligationKeys.all })
      setForm(null)
    },
    onError: (e) => toast.error(getErrorMessage(e, 'Não foi possível salvar a obrigação.')),
  })

  const remove = useMutation({
    mutationFn: (id: string) => obligationsApi.remove(id),
    onSuccess: () => {
      toast.success('Obrigação excluída. As tarefas já criadas continuam.')
      queryClient.invalidateQueries({ queryKey: obligationKeys.all })
      setRemoving(null)
    },
    onError: (e) => toast.error(getErrorMessage(e, 'Não foi possível excluir.')),
  })

  const generate = useMutation({
    mutationFn: () => obligationsApi.generate(generating!.id, `${period}-01`),
    onSuccess: (r) => {
      const parts = [`${r.created} tarefa(s) criada(s)`]
      if (r.existing) parts.push(`${r.existing} já existia(m)`)
      if (r.withoutAssignee) parts.push(`${r.withoutAssignee} empresa(s) sem responsável`)
      toast.success(parts.join(' · ') + '.')
      queryClient.invalidateQueries({ queryKey: obligationKeys.all })
      queryClient.invalidateQueries({ queryKey: taskKeys.all })
      setGenerating(null)
    },
    onError: (e) => toast.error(getErrorMessage(e, 'Não foi possível gerar as tarefas.')),
  })

  const items = list.data ?? []

  return (
    <main className="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to="/tarefas" className="text-sm text-slate-500 hover:text-ink">
            Tarefas
          </Link>
          <h1 className="text-xl font-semibold text-ink">Obrigações recorrentes</h1>
          <p className="text-sm text-slate-500">
            Cada obrigação vira uma tarefa por empresa e competência, para o responsável do departamento, com antecedência do
            vencimento.
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setForm({ obligation: null })}>
            <Plus className="h-4 w-4" /> Nova obrigação
          </Button>
        )}
      </div>

      <Card className="overflow-hidden">
        {list.isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={<CalendarClock className="h-8 w-8" />}
              title="Nenhuma obrigação cadastrada."
              description="Cadastre DCTFWeb, DAS, folha, SPED e o que mais se repete todo mês. O Contix cria as tarefas sozinho."
            />
          </div>
        ) : (
          <Table>
            <THead>
              <tr>
                <Th>Obrigação</Th>
                <Th>Departamento</Th>
                <Th>Aplica-se a</Th>
                <Th>Próximo vencimento</Th>
                <Th>Tarefas</Th>
                {isAdmin && <Th className="w-12" />}
              </tr>
            </THead>
            <TBody>
              {items.map((o) => (
                <Tr key={o.id} className={o.active ? undefined : 'opacity-60'}>
                  <Td>
                    <p className="font-medium text-ink">
                      {o.title} {!o.active && <Badge className="ml-1">Inativa</Badge>}
                    </p>
                    <p className="text-xs text-slate-500">{describeSchedule(o)}</p>
                  </Td>
                  <Td>{departmentLabels[o.department]}</Td>
                  <Td className="text-sm">
                    {o.regimes.length === 0 ? 'Todas as empresas' : o.regimes.map(regimeLabel).join(', ')}
                  </Td>
                  <Td className="whitespace-nowrap">
                    {o.nextDueDate ? formatDate(o.nextDueDate) : '—'}
                    {o.nextPeriod && <p className="text-xs text-slate-500">competência {formatDate(o.nextPeriod, 'MM/yyyy')}</p>}
                  </Td>
                  <Td>{o.generatedTasks}</Td>
                  {isAdmin && (
                    <Td>
                      <DropdownMenu
                        trigger={({ toggle, open }) => (
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Ações de ${o.title}`}
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
                                setForm({ obligation: o })
                              }}
                            >
                              Editar
                            </MenuItem>
                            <MenuItem
                              onClick={() => {
                                close()
                                setPeriod(o.nextPeriod?.slice(0, 7) ?? thisMonth())
                                setGenerating(o)
                              }}
                            >
                              Gerar tarefas agora
                            </MenuItem>
                            <MenuItem
                              onClick={() => {
                                close()
                                setRemoving(o)
                              }}
                            >
                              Excluir
                            </MenuItem>
                          </>
                        )}
                      </DropdownMenu>
                    </Td>
                  )}
                </Tr>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      {form && (
        <ObligationFormModal
          key={form.obligation?.id ?? 'new'}
          open
          obligation={form?.obligation ?? null}
          saving={save.isPending}
          onClose={() => setForm(null)}
          onSubmit={(input) => save.mutate(input)}
        />
      )}

      <Modal
        open={!!generating}
        onClose={() => setGenerating(null)}
        size="sm"
        title="Gerar tarefas agora"
        description="Cria as tarefas da competência para as empresas aplicáveis. Quem já tem a tarefa não ganha outra."
        footer={
          <>
            <Button variant="secondary" onClick={() => setGenerating(null)}>
              Cancelar
            </Button>
            <Button onClick={() => generate.mutate()} loading={generate.isPending} disabled={!period}>
              Gerar
            </Button>
          </>
        }
      >
        <FormField label="Competência" htmlFor="gen-period">
          <Input id="gen-period" type="month" value={period} onChange={(e) => setPeriod(e.target.value)} />
        </FormField>
      </Modal>

      <ConfirmModal
        open={!!removing}
        title={`Excluir ${removing?.title ?? ''}?`}
        description="Novas tarefas deixam de ser criadas. As tarefas já criadas continuam com os responsáveis."
        loading={remove.isPending}
        onConfirm={() => removing && remove.mutate(removing.id)}
        onClose={() => setRemoving(null)}
      />
    </main>
  )
}
