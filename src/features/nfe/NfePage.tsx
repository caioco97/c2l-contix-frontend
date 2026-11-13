import { useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Download, FileCheck2, FileUp, Search, Stamp } from 'lucide-react'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Select,
  Skeleton,
  Table,
  TBody,
  Td,
  Th,
  THead,
  Tr,
  Tabs,
  useToast,
} from '@/components/ui'
import { useAuth } from '@/features/auth/AuthContext'
import { CompanyContextBar, CompanyGate } from '@/features/companies/CompanySelector'
import { getErrorMessage } from '@/lib/api'
import { formatCpfCnpj } from '@/lib/br'
import { cn } from '@/lib/cn'
import { saveFile } from '@/lib/download'
import { formatDate, formatDateTime } from '@/lib/format'
import { nfeApi, nfeKeys } from './api'
import { ImportXmlModal } from './components/ImportXmlModal'
import { ManifestModal } from './components/ManifestModal'
import { SefazIntegrationCard } from './components/SefazIntegrationCard'
import { formatAccessKey, isFinal, manifestationLabel, manifestationTone, money, statusTone } from './meta'
import type { Nfe, NfeFilters, NfeManifestation, NfeSummary } from './types'

const PAGE_SIZE = 20
type View = 'notes' | 'sefaz'

/** Manifestação de NF-e: notas emitidas contra o CNPJ da empresa ativa (cliente e escritório) e integração com a SEFAZ (escritório). */
export function NfePage() {
  const { user } = useAuth()
  const isOffice = !!user && user.role !== 'Client'
  const [view, setView] = useState<View>('notes')

  return (
    <>
      <CompanyContextBar />
      <main className="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6">
        <div>
          <h1 className="text-xl font-semibold text-ink">Manifestação de NF-e</h1>
          <p className="text-sm text-slate-500">
            Confira as notas fiscais emitidas contra o CNPJ da empresa e informe se a operação aconteceu.
          </p>
        </div>
        {isOffice && (
          <Tabs
            items={[
              { value: 'notes', label: 'Notas fiscais' },
              { value: 'sefaz', label: 'Integração SEFAZ' },
            ]}
            value={view}
            onChange={setView}
          />
        )}
        <CompanyGate purpose="consultar as notas fiscais">
          {(company) =>
            view === 'sefaz' && isOffice ? (
              <SefazIntegrationCard companyId={company.id} />
            ) : (
              <NotesList key={company.id} companyId={company.id} isOffice={isOffice} />
            )
          }
        </CompanyGate>
      </main>
    </>
  )
}

const QUICK: { value: NfeManifestation | ''; label: string; count: (s: NfeSummary) => number }[] = [
  { value: '', label: 'Todas', count: (s) => s.total },
  { value: 'SemManifestacao', label: 'Pendentes', count: (s) => s.pending },
  { value: 'Ciencia', label: 'Com ciência', count: (s) => s.acknowledged },
  { value: 'Confirmada', label: 'Confirmadas', count: (s) => s.confirmed },
  { value: 'Desconhecida', label: 'Desconhecidas', count: (s) => s.unknown },
  { value: 'NaoRealizada', label: 'Não realizadas', count: (s) => s.notPerformed },
]

function NotesList({ companyId, isOffice }: { companyId: string; isOffice: boolean }) {
  const [filters, setFilters] = useState<NfeFilters>({ page: 1, pageSize: PAGE_SIZE, manifestation: '', status: '', search: '' })
  const [search, setSearch] = useState('')
  const [manifesting, setManifesting] = useState<Nfe | null>(null)
  const [importing, setImporting] = useState(false)
  const queryClient = useQueryClient()
  const toast = useToast()

  const set = (patch: Partial<NfeFilters>) => setFilters((f) => ({ ...f, ...patch, page: patch.page ?? 1 }))
  const { data, isLoading, isFetching } = useQuery({
    queryKey: nfeKeys.list(companyId, filters),
    queryFn: () => nfeApi.list(companyId, filters),
    placeholderData: keepPreviousData,
  })
  const { data: summary } = useQuery({ queryKey: nfeKeys.summary(companyId), queryFn: () => nfeApi.summary(companyId) })
  const refresh = () => queryClient.invalidateQueries({ queryKey: nfeKeys.all })

  const download = useMutation({
    mutationFn: (n: Nfe) => nfeApi.downloadXml(companyId, n),
    onSuccess: saveFile,
    onError: (e) => toast.error(getErrorMessage(e, 'Não foi possível baixar o XML.')),
  })

  const pages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE))
  const items = data?.items ?? []

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {QUICK.map((q) => (
          <button
            key={q.value}
            type="button"
            onClick={() => set({ manifestation: q.value })}
            className={cn(
              'rounded-full border px-3 py-1 text-sm transition-colors',
              filters.manifestation === q.value
                ? 'border-brand-500 bg-brand-50 text-brand-700'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
            )}
          >
            {q.label}
            {summary && <span className="ml-1.5 text-xs opacity-70">{q.count(summary)}</span>}
          </button>
        ))}
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <form
            className="min-w-56 flex-1"
            onSubmit={(e) => {
              e.preventDefault()
              set({ search })
            }}
          >
            <Input
              leftIcon={<Search className="h-4 w-4" />}
              placeholder="Emitente, CNPJ, número ou chave de acesso"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onBlur={() => search !== filters.search && set({ search })}
              aria-label="Buscar notas"
            />
          </form>
          <label className="text-xs text-slate-500">
            Emitidas de
            <Input type="date" className="mt-1 w-40" value={filters.from ?? ''} onChange={(e) => set({ from: e.target.value })} />
          </label>
          <label className="text-xs text-slate-500">
            até
            <Input type="date" className="mt-1 w-40" value={filters.to ?? ''} onChange={(e) => set({ to: e.target.value })} />
          </label>
          <div className="w-48">
            <Select
              aria-label="Situação"
              value={filters.status}
              onChange={(e) => set({ status: e.target.value as NfeFilters['status'] })}
              placeholder="Todas as situações"
              options={[
                { value: 'Autorizada', label: 'Autorizadas' },
                { value: 'Cancelada', label: 'Canceladas' },
                { value: 'Denegada', label: 'Denegadas' },
              ]}
            />
          </div>
          {isOffice && (
            <Button variant="secondary" onClick={() => setImporting(true)}>
              <FileUp className="h-4 w-4" /> Importar XML
            </Button>
          )}
        </div>
      </Card>

      <Card className={cn('overflow-hidden', isFetching && !isLoading && 'opacity-70')}>
        {isLoading ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            className="m-4"
            icon={<FileCheck2 className="h-6 w-6" />}
            title="Nenhuma nota fiscal para exibir"
            description={
              isOffice
                ? 'Ligue a busca automática na aba Integração SEFAZ ou importe os XMLs das notas.'
                : 'As notas emitidas contra o CNPJ da empresa aparecem aqui assim que o escritório as recebe.'
            }
          />
        ) : (
          <Table>
            <THead>
              <tr>
                <Th>Emissão</Th>
                <Th>Emitente</Th>
                <Th>Número</Th>
                <Th className="text-right">Valor</Th>
                <Th>Situação</Th>
                <Th>Manifestação</Th>
                <Th className="text-right">Ações</Th>
              </tr>
            </THead>
            <TBody>
              {items.map((n) => (
                <Tr key={n.id}>
                  <Td className="whitespace-nowrap">{formatDate(n.issuedAt)}</Td>
                  <Td>
                    <span className="block font-medium text-ink">{n.issuerName}</span>
                    <span className="block text-xs text-slate-500">{formatCpfCnpj(n.issuerDocument)}</span>
                    <span className="block font-mono text-[11px] text-slate-400" title="Chave de acesso">
                      {formatAccessKey(n.accessKey)}
                    </span>
                  </Td>
                  <Td className="whitespace-nowrap">
                    {n.number}
                    <span className="text-xs text-slate-400"> / {n.series}</span>
                  </Td>
                  <Td className="whitespace-nowrap text-right font-medium">{money(n.total)}</Td>
                  <Td>
                    <Badge tone={statusTone[n.status]}>{n.status}</Badge>
                  </Td>
                  <Td>
                    {n.status === 'Cancelada' && n.manifestation === 'SemManifestacao' ? (
                      <span className="text-xs text-slate-400">Não se aplica</span>
                    ) : (
                      <Badge tone={manifestationTone[n.manifestation]}>{manifestationLabel[n.manifestation]}</Badge>
                    )}
                    {n.manifestedAt && (
                      <span className="mt-0.5 block text-[11px] text-slate-500">
                        {n.autoManifested ? 'Automática' : (n.manifestedBy ?? '—')} · {formatDateTime(n.manifestedAt)}
                        {!n.sentToSefaz && ' · só no Contix'}
                      </span>
                    )}
                  </Td>
                  <Td className="text-right">
                    <div className="flex justify-end gap-1">
                      {n.status !== 'Cancelada' && !isFinal(n.manifestation) && (
                        <Button size="sm" onClick={() => setManifesting(n)}>
                          <Stamp className="h-4 w-4" /> Manifestar
                        </Button>
                      )}
                      {n.hasXml && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title={n.fullXml ? 'Baixar XML' : 'Baixar resumo (XML completo após a ciência)'}
                          aria-label="Baixar XML"
                          onClick={() => download.mutate(n)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        )}
        {pages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
            <span>
              {data?.total} notas · página {filters.page} de {pages}
            </span>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" aria-label="Página anterior" disabled={filters.page <= 1} onClick={() => set({ page: filters.page - 1 })}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" aria-label="Próxima página" disabled={filters.page >= pages} onClick={() => set({ page: filters.page + 1 })}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      <ManifestModal
        note={manifesting}
        onClose={() => setManifesting(null)}
        onSubmit={async (type, justification) => {
          try {
            const n = await nfeApi.manifest(companyId, manifesting!.id, type, justification)
            toast.success(n.sentToSefaz ? 'Manifestação registrada na SEFAZ.' : 'Manifestação registrada.')
            setManifesting(null)
            refresh()
          } catch (e) {
            toast.error(getErrorMessage(e, 'Não foi possível registrar a manifestação.'))
          }
        }}
      />
      {isOffice && <ImportXmlModal companyId={companyId} open={importing} onClose={() => setImporting(false)} onImported={refresh} />}
    </div>
  )
}
