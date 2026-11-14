import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Card, CardBody, Select, Skeleton, useToast } from '@/components/ui'
import { requestKeys, requestsApi } from '@/features/requests/api'
import { getErrorMessage } from '@/lib/api'
import type { Department } from '@/types/domain'
import { teamApi, teamKeys } from '../api'

/**
 * Responsável de cada departamento pela empresa. Solicitações novas do cliente vão direto para ele
 * (e só ele é avisado); sem responsável, toda a equipe recebe o aviso.
 * Monte com `key={companyId}` para o rascunho não passar de uma empresa para outra.
 */
export function CompanyResponsiblesTab({ companyId }: { companyId: string }) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const current = useQuery({ queryKey: teamKeys.responsibles(companyId), queryFn: () => teamApi.responsibles(companyId) })
  const users = useQuery({ queryKey: requestKeys.officeUsers, queryFn: requestsApi.officeUsers, staleTime: 5 * 60_000 })
  // Só as alterações ainda não salvas; o resto vem do servidor.
  const [draft, setDraft] = useState<Record<string, string>>({})
  const valueOf = (r: { department: string; userId: string | null }) => draft[r.department] ?? r.userId ?? ''

  const changed = (current.data ?? []).filter((r) => (r.userId ?? '') !== valueOf(r))

  const save = useMutation({
    mutationFn: () =>
      teamApi.setResponsibles(
        companyId,
        changed.map((r) => ({ department: r.department as Department, userId: valueOf(r) || null })),
      ),
    onSuccess: (data) => {
      toast.success('Responsáveis salvos.')
      queryClient.setQueryData(teamKeys.responsibles(companyId), data)
      setDraft({})
    },
    onError: (e) => toast.error(getErrorMessage(e, 'Não foi possível salvar os responsáveis.')),
  })

  if (current.isLoading) return <Skeleton className="h-64" />

  const userOptions = (users.data ?? []).map((u) => ({ value: u.id, label: u.name }))

  return (
    <Card>
      <CardBody className="space-y-4">
        <p className="text-sm text-slate-600">
          Quem cuida desta empresa em cada departamento. As solicitações novas vão direto para essa pessoa, e as tarefas das
          obrigações recorrentes também.
        </p>
        <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
          {(current.data ?? []).map((r) => {
            const options =
              r.userId && !userOptions.some((o) => o.value === r.userId)
                ? [...userOptions, { value: r.userId, label: `${r.userName ?? 'Usuário'} (inativo)` }]
                : userOptions
            return (
              <div key={r.department} className="grid items-center gap-2 px-4 py-3 sm:grid-cols-[200px_1fr]">
                <label htmlFor={`resp-${r.department}`} className="text-sm font-medium text-ink">
                  {r.departmentName}
                  {!r.departmentActive && <span className="ml-1 text-xs font-normal text-slate-400">(inativo)</span>}
                </label>
                <Select
                  id={`resp-${r.department}`}
                  placeholder="Sem responsável (avisa toda a equipe)"
                  value={valueOf(r)}
                  onChange={(e) => setDraft((d) => ({ ...d, [r.department]: e.target.value }))}
                  options={options}
                />
              </div>
            )
          })}
        </div>
        <div className="flex justify-end">
          <Button onClick={() => save.mutate()} loading={save.isPending} disabled={changed.length === 0}>
            Salvar responsáveis
          </Button>
        </div>
      </CardBody>
    </Card>
  )
}
