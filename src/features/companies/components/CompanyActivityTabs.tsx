import { useState } from 'react'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { Download, FileText, History, Inbox, ShieldCheck } from 'lucide-react'
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  SegmentedControl,
  Skeleton,
  Table,
  TBody,
  Td,
  Th,
  THead,
  Tr,
} from '@/components/ui'
import { CndStatusBadge } from '@/features/cnd/components/CndStatusBadge'
import { cndApi, cndKeys } from '@/features/cnd/api'
import { useDownloadCnd } from '@/features/cnd/hooks'
import { documentKeys, documentsApi, type DocumentQuery } from '@/features/documents/api'
import { requestKeys, requestsApi, type RequestFilters } from '@/features/requests/api'
import { Pager, RequestsTable } from '@/features/requests/components/RequestsTable'
import { formatDate, formatDateTime } from '@/lib/format'
import type { HistoryCategory } from '@/types/domain'
import { companiesApi, companyKeys } from '../api'
import { HISTORY_CATEGORIES } from '../meta'

const Loading = () => (
  <div className="space-y-2 p-4">
    {Array.from({ length: 4 }, (_, i) => (
      <Skeleton key={i} className="h-10" />
    ))}
  </div>
)

/** Últimos documentos da empresa, nos dois sentidos. */
export function DocumentsTab({ companyId, onOpen }: { companyId: string; onOpen: () => void }) {
  const q: DocumentQuery = { filter: 'all', search: '', sortBy: 'publishedAt', sortDir: 'desc', page: 1, pageSize: 15 }
  const { data, isLoading } = useQuery({ queryKey: documentKeys.list(companyId, q), queryFn: () => documentsApi.list(companyId, q) })
  const items = data?.items ?? []

  return (
    <Card className="overflow-hidden">
      <CardHeader
        className="pb-4"
        title="Documentos recentes"
        action={
          <Button variant="secondary" size="sm" onClick={onOpen}>
            Abrir documentos
          </Button>
        }
      />
      {isLoading ? (
        <Loading />
      ) : items.length === 0 ? (
        <div className="p-6">
          <EmptyState icon={<FileText className="h-8 w-8" />} title="Nenhum documento publicado ainda." />
        </div>
      ) : (
        <Table>
          <THead>
            <tr>
              <Th>Documento</Th>
              <Th>Origem</Th>
              <Th>Publicado em</Th>
              <Th>Vencimento</Th>
              <Th>Visto</Th>
            </tr>
          </THead>
          <TBody>
            {items.map((d) => (
              <Tr key={d.id}>
                <Td>
                  <p className="font-medium text-ink">{d.name}</p>
                  <p className="text-xs text-slate-500">{d.folderPath}</p>
                </Td>
                <Td>{d.origin === 'client' ? <Badge tone="info">Cliente</Badge> : <Badge>Escritório</Badge>}</Td>
                <Td className="whitespace-nowrap text-xs">{formatDate(d.publishedAt)}</Td>
                <Td className="whitespace-nowrap text-xs">{d.dueDate ? formatDate(d.dueDate) : '—'}</Td>
                <Td className="text-xs">
                  {d.origin === 'client'
                    ? d.isRead
                      ? 'Lido pelo escritório'
                      : 'Não lido'
                    : d.recipientViews
                      ? `${d.recipientViews} pessoa(s)`
                      : 'Ninguém ainda'}
                </Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      )}
    </Card>
  )
}

const REQUESTS_PAGE = 15

/** Solicitações da empresa; o detalhe abre no atendimento. */
export function RequestsTab({ companyId }: { companyId: string }) {
  const [page, setPage] = useState(1)
  const [inProgress, setInProgress] = useState<'open' | 'all'>('open')
  const f: RequestFilters = { inProgress: inProgress === 'open', sortBy: 'atualizado', sortDesc: true, page, pageSize: REQUESTS_PAGE }
  const { data, isLoading } = useQuery({ queryKey: requestKeys.list(companyId, f), queryFn: () => requestsApi.list(companyId, f) })
  const items = data?.items ?? []

  return (
    <Card className="overflow-hidden">
      <CardHeader
        className="pb-4"
        title="Solicitações"
        action={
          <SegmentedControl
            value={inProgress}
            onChange={(v) => {
              setInProgress(v)
              setPage(1)
            }}
            items={[
              { value: 'open', label: 'Em andamento' },
              { value: 'all', label: 'Todas' },
            ]}
          />
        }
      />
      {isLoading ? (
        <Loading />
      ) : items.length === 0 ? (
        <div className="p-6">
          <EmptyState
            icon={<Inbox className="h-8 w-8" />}
            title={inProgress === 'open' ? 'Nenhuma solicitação em andamento.' : 'Nenhuma solicitação aberta pela empresa.'}
          />
        </div>
      ) : (
        <>
          <RequestsTable items={items} office hrefOf={(r) => `/atendimento/${companyId}/${r.id}`} />
          <Pager page={page} total={data?.total ?? 0} pageSize={REQUESTS_PAGE} onPage={setPage} />
        </>
      )}
    </Card>
  )
}

/** Certidões vigentes da empresa. */
export function CndTab({ companyId, onManage }: { companyId: string; onManage: () => void }) {
  const { data = [], isLoading } = useQuery({ queryKey: cndKeys.list(companyId), queryFn: () => cndApi.list(companyId) })
  const download = useDownloadCnd()

  return (
    <Card className="overflow-hidden">
      <CardHeader
        className="pb-4"
        title="Certidões"
        action={
          <Button variant="secondary" size="sm" onClick={onManage}>
            Gerenciar certidões
          </Button>
        }
      />
      {isLoading ? (
        <Loading />
      ) : data.length === 0 ? (
        <div className="p-6">
          <EmptyState icon={<ShieldCheck className="h-8 w-8" />} title="Nenhuma certidão cadastrada." />
        </div>
      ) : (
        <Table>
          <THead>
            <tr>
              <Th>Certidão</Th>
              <Th>Situação</Th>
              <Th>Emissão</Th>
              <Th>Validade</Th>
              <Th>
                <span className="sr-only">Arquivo</span>
              </Th>
            </tr>
          </THead>
          <TBody>
            {data.map((c) => (
              <Tr key={c.id}>
                <Td>
                  <p className="font-medium text-ink">{c.typeName}</p>
                  {c.number && <p className="font-mono text-xs text-slate-500">{c.number}</p>}
                </Td>
                <Td>
                  <CndStatusBadge status={c.status} />
                </Td>
                <Td className="whitespace-nowrap text-xs">{formatDate(c.issuedAt)}</Td>
                <Td className="whitespace-nowrap text-xs">
                  {formatDate(c.validUntil)}
                  <span className="block text-slate-500">
                    {c.daysToExpire < 0 ? `vencida há ${-c.daysToExpire} dia(s)` : `${c.daysToExpire} dia(s)`}
                  </span>
                </Td>
                <Td className="text-right">
                  {c.hasFile && (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Baixar ${c.typeName}`}
                      loading={download.isPending && download.variables?.id === c.id}
                      onClick={() => download.mutate(c)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                </Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      )}
    </Card>
  )
}

type CategoryFilter = HistoryCategory | 'all'

/** Linha do tempo: documentos, solicitações, certidões e acessos, do mais recente ao mais antigo. */
export function HistoryTab({ companyId }: { companyId: string }) {
  const [category, setCategory] = useState<CategoryFilter>('all')
  const cat = category === 'all' ? undefined : category
  const history = useInfiniteQuery({
    queryKey: companyKeys.history(companyId, cat),
    queryFn: ({ pageParam }) => companiesApi.history(companyId, { before: pageParam, category: cat }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.next,
  })
  const items = history.data?.pages.flatMap((p) => p.items) ?? []
  const labelOf = (c: HistoryCategory) => HISTORY_CATEGORIES.find((x) => x.value === c)?.label ?? c

  return (
    <Card>
      <CardHeader
        title="Histórico"
        action={
          <SegmentedControl
            className="flex-wrap"
            value={category}
            onChange={setCategory}
            items={[{ value: 'all' as CategoryFilter, label: 'Tudo' }, ...HISTORY_CATEGORIES]}
          />
        }
      />
      {history.isLoading ? (
        <Loading />
      ) : items.length === 0 ? (
        <div className="p-6">
          <EmptyState icon={<History className="h-8 w-8" />} title="Nada registrado ainda." />
        </div>
      ) : (
        <ol className="space-y-3 p-5">
          {items.map((i) => (
            <li key={`${i.category}-${i.id}`} className="flex gap-3 border-l-2 border-slate-200 pl-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-ink">{i.title}</p>
                <p className="text-xs text-slate-500">
                  {formatDateTime(i.at)} · {labelOf(i.category)}
                  {i.userName && ` · ${i.userName}${i.isOffice === false ? ' (cliente)' : ''}`}
                  {i.detail && ` · ${i.detail}`}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
      {history.hasNextPage && (
        <div className="border-t border-slate-100 p-3 text-center">
          <Button variant="ghost" size="sm" loading={history.isFetchingNextPage} onClick={() => history.fetchNextPage()}>
            Carregar mais
          </Button>
        </div>
      )}
    </Card>
  )
}
