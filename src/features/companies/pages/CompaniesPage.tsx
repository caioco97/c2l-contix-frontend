import { useEffect, useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Building2, ChevronLeft, ChevronRight, Plus, Search, Trash2 } from 'lucide-react'
import { Badge, Button, Card, EmptyState, Input, Select, Skeleton, Table, TBody, Td, Th, THead, Tr, useToast } from '@/components/ui'
import { useAuth } from '@/features/auth/AuthContext'
import { getErrorMessage } from '@/lib/api'
import { formatCnpj } from '@/lib/format'
import type { CompanyInput, CompanyStatus, TaxRegime } from '@/types/domain'
import { companiesApi, companyKeys, type CompanyFilters } from '../api'
import { CompanyFormModal } from '../components/CompanyFormModal'
import { DeleteCompanyModal, type CompanyToDelete } from '../components/DeleteCompanyModal'
import { COMPANY_STATUSES, regimeLabel, statusOf, TAX_REGIMES } from '../meta'

const PAGE_SIZE = 20

function useDebounced<T>(value: T, ms = 300) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}

/** Empresas clientes do escritório: busca, filtros e cadastro. */
export function CompaniesPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [taxRegime, setTaxRegime] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [creating, setCreating] = useState(false)
  const [removing, setRemoving] = useState<CompanyToDelete | null>(null)
  const { user } = useAuth()
  const isAdmin = user?.role === 'Admin'
  const debounced = useDebounced(search)

  const filters: CompanyFilters = {
    search: debounced,
    taxRegime: (taxRegime || undefined) as TaxRegime | undefined,
    status: (status || undefined) as CompanyStatus | undefined,
    page,
    pageSize: PAGE_SIZE,
  }
  const { data, isLoading } = useQuery({
    queryKey: companyKeys.list(filters),
    queryFn: () => companiesApi.search(filters),
    placeholderData: keepPreviousData,
  })
  const items = data?.items ?? []
  const pages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE))

  const create = useMutation({
    mutationFn: (input: CompanyInput) => companiesApi.create(input),
    onSuccess: (c) => {
      toast.success('Empresa cadastrada.')
      queryClient.invalidateQueries({ queryKey: companyKeys.all })
      setCreating(false)
      navigate(`/empresas/${c.id}?aba=usuarios`)
    },
    onError: (e) => toast.error(getErrorMessage(e, 'Não foi possível cadastrar a empresa.')),
  })

  const reset = <T,>(set: (v: T) => void) => (v: T) => {
    set(v)
    setPage(1)
  }

  return (
    <main className="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink">Empresas</h1>
          <p className="text-sm text-slate-500">Cadastro das empresas clientes e acesso dos usuários ao portal.</p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" /> Nova empresa
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
        <Input
          aria-label="Buscar empresa"
          placeholder="Razão social, nome fantasia, apelido ou CNPJ"
          leftIcon={<Search className="h-4 w-4" />}
          value={search}
          onChange={(e) => reset(setSearch)(e.target.value)}
        />
        <Select
          aria-label="Regime tributário"
          placeholder="Todos os regimes"
          options={TAX_REGIMES}
          value={taxRegime}
          onChange={(e) => reset(setTaxRegime)(e.target.value)}
        />
        <Select
          aria-label="Situação"
          placeholder="Todas as situações"
          options={COMPANY_STATUSES}
          value={status}
          onChange={(e) => reset(setStatus)(e.target.value)}
        />
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={<Building2 className="h-8 w-8" />}
              title={debounced || taxRegime || status ? 'Nenhuma empresa encontrada.' : 'Nenhuma empresa cadastrada ainda.'}
              action={
                !debounced && !taxRegime && !status ? (
                  <Button onClick={() => setCreating(true)}>
                    <Plus className="h-4 w-4" /> Cadastrar a primeira empresa
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <>
            <Table>
              <THead>
                <tr>
                  <Th>Empresa</Th>
                  <Th>CNPJ / CPF</Th>
                  <Th>Regime</Th>
                  <Th>Situação</Th>
                  {isAdmin && <Th className="w-12"><span className="sr-only">Ações</span></Th>}
                </tr>
              </THead>
              <TBody>
                {items.map((c) => {
                  const href = `/empresas/${c.id}`
                  const s = statusOf(c.status)
                  return (
                    <Tr
                      key={c.id}
                      className="cursor-pointer"
                      tabIndex={0}
                      onClick={() => navigate(href)}
                      onKeyDown={(e) => e.key === 'Enter' && navigate(href)}
                    >
                      <Td>
                        <p className="font-medium text-ink">{c.tradeName || c.legalName}</p>
                        <p className="text-xs text-slate-500">
                          {c.tradeName ? c.legalName : ''}
                          {c.nickname && <span className="ml-1 font-mono">{c.nickname}</span>}
                        </p>
                      </Td>
                      <Td className="whitespace-nowrap font-mono text-xs">{formatCnpj(c.document)}</Td>
                      <Td>{regimeLabel(c.taxRegime)}</Td>
                      <Td>
                        <Badge tone={s.tone}>{s.label}</Badge>
                      </Td>
                      {isAdmin && (
                        <Td className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Excluir ${c.tradeName || c.legalName}`}
                            title="Excluir empresa"
                            onClick={(e) => {
                              e.stopPropagation()
                              setRemoving(c)
                            }}
                            onKeyDown={(e) => e.stopPropagation()}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </Td>
                      )}
                    </Tr>
                  )
                })}
              </TBody>
            </Table>
            {pages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2 text-sm text-slate-600">
                <span>
                  {data?.total} empresas · página {page} de {pages}
                </span>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" aria-label="Página anterior" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" aria-label="Próxima página" disabled={page >= pages} onClick={() => setPage(page + 1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      <CompanyFormModal
        open={creating}
        onClose={() => setCreating(false)}
        onSubmit={(input) => create.mutateAsync(input).then(() => undefined, () => undefined)}
      />

      <DeleteCompanyModal company={removing} onClose={() => setRemoving(null)} />
    </main>
  )
}
