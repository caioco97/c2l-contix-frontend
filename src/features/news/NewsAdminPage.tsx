import { useEffect, useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Image, Megaphone, Paperclip, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import {
  Badge,
  Button,
  Card,
  ConfirmModal,
  EmptyState,
  Input,
  SegmentedControl,
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
import { formatDateTime } from '@/lib/format'
import type { NewsInput, NewsStatus, OfficeNews } from '@/types/domain'
import { newsKeys, officeNewsApi, type OfficeNewsQuery } from './api'
import { NewsFormModal } from './components/NewsFormModal'
import { NewsReachModal } from './components/NewsReachModal'
import { NEWS_AUDIENCES, NEWS_STATUS } from './meta'

const PAGE_SIZE = 20
type StatusFilter = 'all' | NewsStatus

function useDebounced<T>(value: T, ms = 300) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}

/** Gestão de notícias e comunicados pelo escritório. */
export function NewsAdminPage() {
  const [status, setStatus] = useState<StatusFilter>('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [form, setForm] = useState<{ id: string | null } | null>(null)
  const [reach, setReach] = useState<OfficeNews | null>(null)
  const [removing, setRemoving] = useState<OfficeNews | null>(null)
  const debounced = useDebounced(search)
  const queryClient = useQueryClient()
  const toast = useToast()

  const query: OfficeNewsQuery = { search: debounced, status: status === 'all' ? undefined : status, page, pageSize: PAGE_SIZE }
  const { data, isLoading } = useQuery({
    queryKey: newsKeys.office(query),
    queryFn: () => officeNewsApi.list(query),
    placeholderData: keepPreviousData,
  })
  const items = data?.items ?? []
  const pages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE))

  const save = useMutation({
    mutationFn: ({ id, input }: { id: string | null; input: NewsInput }) =>
      id ? officeNewsApi.update(id, input) : officeNewsApi.create(input),
    onSuccess: (n, { id }) => {
      toast.success(id ? 'Notícia atualizada.' : n.status === 'Agendada' ? 'Notícia agendada.' : 'Notícia publicada.')
      queryClient.invalidateQueries({ queryKey: newsKeys.all })
      setForm(null)
    },
    onError: (e) => toast.error(getErrorMessage(e, 'Não foi possível salvar a notícia.')),
  })
  const remove = useMutation({
    mutationFn: (n: OfficeNews) => officeNewsApi.remove(n.id),
    onSuccess: () => {
      toast.success('Notícia excluída.')
      queryClient.invalidateQueries({ queryKey: newsKeys.all })
      setRemoving(null)
    },
    onError: (e) => toast.error(getErrorMessage(e, 'Não foi possível excluir.')),
  })

  return (
    <main className="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink">Notícias e comunicados</h1>
          <p className="text-sm text-slate-500">Publique avisos para os clientes e acompanhe quantas empresas leram.</p>
        </div>
        <Button onClick={() => setForm({ id: null })}>
          <Plus className="h-4 w-4" /> Nova notícia
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="w-full sm:w-72">
          <Input
            leftIcon={<Search className="h-4 w-4" />}
            placeholder="Buscar pelo título"
            aria-label="Buscar notícias"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
          />
        </div>
        <SegmentedControl<StatusFilter>
          items={[
            { value: 'all', label: 'Todas' },
            { value: 'Publicada', label: 'Publicadas' },
            { value: 'Agendada', label: 'Agendadas' },
            { value: 'Expirada', label: 'Expiradas' },
          ]}
          value={status}
          onChange={(v) => {
            setStatus(v)
            setPage(1)
          }}
        />
      </div>

      <Card>
        {isLoading ? (
          <div className="space-y-2 p-4">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            className="m-4"
            icon={<Megaphone className="h-8 w-8" />}
            title={debounced || status !== 'all' ? 'Nenhuma notícia encontrada' : 'Nenhuma notícia publicada ainda'}
            action={
              !debounced && status === 'all' && (
                <Button size="sm" onClick={() => setForm({ id: null })}>
                  <Plus className="h-4 w-4" /> Publicar a primeira
                </Button>
              )
            }
          />
        ) : (
          <>
            <Table>
              <THead>
                <tr>
                  <Th>Notícia</Th>
                  <Th>Publicação</Th>
                  <Th>Situação</Th>
                  <Th>Público</Th>
                  <Th>Alcance</Th>
                  <Th className="text-right">Ações</Th>
                </tr>
              </THead>
              <TBody>
                {items.map((n) => {
                  const s = NEWS_STATUS[n.status]
                  return (
                    <Tr key={n.id}>
                      <Td className="max-w-md">
                        <p className="flex items-center gap-1.5 font-medium text-ink">
                          <span className="truncate">{n.title}</span>
                          {n.hasImage && <Image className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-label="Com imagem" />}
                          {n.attachmentCount > 0 && <Paperclip className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-label="Com anexos" />}
                        </p>
                        <p className="line-clamp-1 text-xs text-slate-500">{n.summary}</p>
                      </Td>
                      <Td className="whitespace-nowrap">
                        <p>{formatDateTime(n.publishAt)}</p>
                        {n.expiresAt && <p className="text-xs text-slate-500">até {formatDateTime(n.expiresAt)}</p>}
                      </Td>
                      <Td>
                        <Badge tone={s.tone}>{s.label}</Badge>
                      </Td>
                      <Td className="whitespace-nowrap">{NEWS_AUDIENCES.find((a) => a.value === n.audience)?.label}</Td>
                      <Td>
                        <button type="button" className="whitespace-nowrap text-brand-700 hover:underline" onClick={() => setReach(n)}>
                          {n.readers} de {n.recipients} empresa{n.recipients === 1 ? '' : 's'}
                        </button>
                      </Td>
                      <Td>
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" aria-label="Editar" onClick={() => setForm({ id: n.id })}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" aria-label="Excluir" onClick={() => setRemoving(n)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </Td>
                    </Tr>
                  )
                })}
              </TBody>
            </Table>
            {pages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2 text-sm text-slate-600">
                <span>
                  {data?.total} notícias · página {page} de {pages}
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

      <NewsFormModal
        open={!!form}
        newsId={form?.id}
        onClose={() => setForm(null)}
        onSubmit={(input) => save.mutateAsync({ id: form!.id, input }).then(() => undefined, () => undefined)}
      />
      <NewsReachModal news={reach} onClose={() => setReach(null)} />
      <ConfirmModal
        open={!!removing}
        title="Excluir notícia"
        description={`"${removing?.title ?? ''}" deixará de aparecer no portal dos clientes.`}
        loading={remove.isPending}
        onConfirm={() => removing && remove.mutate(removing)}
        onClose={() => setRemoving(null)}
      />
    </main>
  )
}
