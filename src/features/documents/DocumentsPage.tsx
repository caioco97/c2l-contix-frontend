import { useEffect, useMemo, useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, CirclePlus, Download, FileText, Mail, Search, Trash2 } from 'lucide-react'
import {
  Button,
  Checkbox,
  EmptyState,
  Input,
  Modal,
  SegmentedControl,
  Skeleton,
  SortableTh,
  Spinner,
  Table,
  TBody,
  Td,
  Th,
  THead,
  Tr,
  useToast,
} from '@/components/ui'
import { useActiveCompany } from '@/features/companies/ActiveCompanyContext'
import { useAuth } from '@/features/auth/AuthContext'
import { CompanySwitcher } from '@/features/companies/CompanySwitcher'
import { getErrorMessage } from '@/lib/api'
import { cn } from '@/lib/cn'
import { formatDate } from '@/lib/format'
import type { DocumentFolder, ReadFilter } from '@/types/domain'
import { documentKeys, documentsApi, type DocumentQuery, type DocumentSortField } from './api'
import { FolderTree } from './components/FolderTree'
import { SendModal } from './components/SendModal'
import { UploadModal, type UploadForm } from './components/UploadModal'
import { useDownloadDocuments } from './hooks'

const PAGE_SIZE = 10

function findFolder(folders: DocumentFolder[], id: string | undefined): { folder: DocumentFolder; path: string } | null {
  for (const f of folders) {
    if (f.id === id) return { folder: f, path: f.name }
    const child = findFolder(f.children ?? [], id)
    if (child) return { folder: child.folder, path: `${f.name}/${child.path}` }
  }
  return null
}

function useDebounced<T>(value: T, ms = 300) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}

export function DocumentsPage() {
  const { folderId } = useParams()
  const navigate = useNavigate()
  const { company } = useActiveCompany()
  const queryClient = useQueryClient()
  const toast = useToast()
  const companyId = company?.id ?? ''
  const { user } = useAuth()

  const [filter, setFilter] = useState<ReadFilter>('all')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<DocumentSortField>('publishedAt')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [modal, setModal] = useState<'upload' | 'delete' | 'send' | null>(null)
  const debouncedSearch = useDebounced(search)

  const foldersQuery = useQuery({
    queryKey: documentKeys.folders(companyId),
    queryFn: () => documentsApi.folders(companyId),
    enabled: !!companyId,
  })
  const folders = useMemo(() => foldersQuery.data ?? [], [foldersQuery.data])
  const current = findFolder(folders, folderId)

  // Sem pasta na URL: abre a primeira.
  useEffect(() => {
    if (!folderId && folders.length) navigate(`/documentos/${folders[0].id}`, { replace: true })
  }, [folderId, folders, navigate])

  // Ao trocar pasta/filtro/busca/empresa, volta à página 1 e limpa a seleção.
  const contextKey = `${companyId}|${folderId}|${filter}|${debouncedSearch}`
  const [prevContextKey, setPrevContextKey] = useState(contextKey)
  if (prevContextKey !== contextKey) {
    setPrevContextKey(contextKey)
    setPage(1)
    setSelected(new Set())
  }

  const query: DocumentQuery = { folderId, filter, search: debouncedSearch, sortBy, sortDir, page, pageSize: PAGE_SIZE }
  const docsQuery = useQuery({
    queryKey: documentKeys.list(companyId, query),
    queryFn: () => documentsApi.list(companyId, query),
    enabled: !!companyId && !!folderId,
    placeholderData: keepPreviousData,
  })
  const docs = docsQuery.data?.items ?? []
  const total = docsQuery.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const invalidate = () => queryClient.invalidateQueries({ queryKey: documentKeys.all(companyId) })
  const download = useDownloadDocuments()

  const remove = useMutation({
    mutationFn: (ids: string[]) => documentsApi.remove(companyId, ids),
    onSuccess: (_, ids) => {
      toast.success(`${ids.length} documento(s) excluído(s).`)
      setSelected(new Set())
      setModal(null)
      invalidate()
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const upload = async (values: UploadForm) => {
    if (!current) return
    try {
      await documentsApi.upload(companyId, {
        folderId: current.folder.id,
        folderPath: current.path,
        files: values.files,
        comment: values.comment,
        dueDate: values.dueDate || undefined,
      })
      toast.success(`${values.files.length} documento(s) adicionado(s) em ${current.folder.name}.`)
      setModal(null)
      invalidate()
    } catch (e) {
      toast.error(getErrorMessage(e, 'Falha no envio dos arquivos.'))
    }
  }

  const send = async (message: string) => {
    try {
      await documentsApi.send(companyId, { ids: [...selected], message })
      toast.success('Documentos enviados por e-mail.')
      setModal(null)
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  const toggleSort = (field: DocumentSortField) => {
    if (sortBy === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortBy(field)
      setSortDir(field === 'name' ? 'asc' : 'desc')
    }
  }

  const allSelected = docs.length > 0 && docs.every((d) => selected.has(d.id))
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(docs.map((d) => d.id)))
  const toggleOne = (id: string) =>
    setSelected((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const hasSelection = selected.size > 0
  // O cliente só envia para pastas liberadas pelo escritório (nos mocks a flag não existe: libera).
  const canUpload = !!current && (user?.role !== 'Client' || current.folder.clientCanUpload !== false)
  const sortProps = (field: DocumentSortField) => ({
    active: sortBy === field,
    direction: sortDir,
    onSort: () => toggleSort(field),
  })

  if (!company) return <Spinner className="py-20" />

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6">
      <div className="mb-5">
        <CompanySwitcher />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[240px_1fr]">
        <aside className="rounded-xl border border-slate-200 bg-white p-2 lg:self-start">
          {foldersQuery.isLoading ? (
            <div className="space-y-2 p-2">
              {Array.from({ length: 7 }, (_, i) => (
                <Skeleton key={i} className="h-8" />
              ))}
            </div>
          ) : (
            <FolderTree folders={folders} selectedId={folderId} onSelect={(f) => navigate(`/documentos/${f.id}`)} />
          )}
        </aside>

        <section className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {/* Barra de ações */}
          <div className="flex flex-wrap items-center gap-2 bg-brand-800 px-3 py-2.5">
            <Button
              variant="onDark"
              size="sm"
              onClick={() => setModal('upload')}
              disabled={!canUpload}
              title={current && !canUpload ? 'O escritório não liberou envio de arquivos nesta pasta.' : undefined}
            >
              <CirclePlus className="h-4 w-4" />
              Adicionar
            </Button>
            <Button
              variant="onDark"
              size="sm"
              disabled={!hasSelection}
              loading={download.isPending}
              onClick={() => download.mutate([...selected])}
            >
              <Download className="h-4 w-4" />
              Baixar
            </Button>
            <Button variant="onDark" size="sm" disabled={!hasSelection} onClick={() => setModal('delete')}>
              <Trash2 className="h-4 w-4" />
              Excluir
            </Button>
            <Button variant="onDark" size="sm" disabled={!hasSelection} onClick={() => setModal('send')}>
              <Mail className="h-4 w-4" />
              Enviar
            </Button>

            <div className="ml-auto flex w-full flex-wrap items-center gap-2 sm:w-auto">
              <SegmentedControl
                className="bg-white/95"
                items={[
                  { value: 'all', label: 'Todos' },
                  { value: 'unread', label: 'Não lidos' },
                  { value: 'read', label: 'Lidos' },
                ]}
                value={filter}
                onChange={setFilter}
              />
              <div className="min-w-0 flex-1 sm:w-56 sm:flex-none">
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Pesquisar"
                  aria-label="Pesquisar documentos"
                  leftIcon={<Search className="h-4 w-4" />}
                  className="h-8 border-transparent"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5 text-sm">
            <span className="font-medium text-slate-600">{current?.path ?? '—'}</span>
            {hasSelection && <span className="text-brand-700">{selected.size} selecionado(s)</span>}
          </div>

          <Table>
            <THead>
              <tr>
                <Th className="w-10">
                  <Checkbox checked={allSelected} onChange={toggleAll} aria-label="Selecionar todos" disabled={!docs.length} />
                </Th>
                <SortableTh {...sortProps('name')}>Nome</SortableTh>
                <Th>Comentários</Th>
                <SortableTh {...sortProps('publishedAt')}>Data de publicação</SortableTh>
                <SortableTh {...sortProps('dueDate')}>Data de vencimento</SortableTh>
                <Th>Adicionado por</Th>
                <SortableTh {...sortProps('modifiedAt')}>Modificado</SortableTh>
              </tr>
            </THead>
            <TBody>
              {docsQuery.isLoading ? (
                Array.from({ length: 4 }, (_, i) => (
                  <tr key={i}>
                    <Td colSpan={7}>
                      <Skeleton className="h-5" />
                    </Td>
                  </tr>
                ))
              ) : docs.length === 0 ? (
                <tr>
                  <Td colSpan={7} className="p-6">
                    <EmptyState
                      icon={<FileText className="h-8 w-8" />}
                      title="Nenhum documento para exibir."
                      description={search ? 'Tente outro termo de pesquisa.' : undefined}
                    />
                  </Td>
                </tr>
              ) : (
                docs.map((doc) => (
                  <Tr key={doc.id} className={cn(selected.has(doc.id) && 'bg-brand-50/60')}>
                    <Td>
                      <Checkbox
                        checked={selected.has(doc.id)}
                        onChange={() => toggleOne(doc.id)}
                        aria-label={`Selecionar ${doc.name}`}
                      />
                    </Td>
                    <Td className="max-w-80">
                      <button
                        type="button"
                        onClick={() => download.mutate([doc.id])}
                        className="flex items-center gap-2 text-left hover:text-brand-700"
                        title="Baixar"
                      >
                        <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                        <span className={cn('truncate', !doc.isRead && 'font-semibold text-ink')}>{doc.name}</span>
                        {!doc.isRead && <span className="h-2 w-2 shrink-0 rounded-full bg-brand-500" aria-label="Não lido" />}
                      </button>
                    </Td>
                    <Td className="max-w-56 truncate text-slate-500">{doc.comment ?? '—'}</Td>
                    <Td className="whitespace-nowrap">{formatDate(doc.publishedAt)}</Td>
                    <Td className="whitespace-nowrap">{formatDate(doc.dueDate)}</Td>
                    <Td className="whitespace-nowrap">{doc.addedBy}</Td>
                    <Td className="whitespace-nowrap">{formatDate(doc.modifiedAt)}</Td>
                  </Tr>
                ))
              )}
            </TBody>
          </Table>

          {total > PAGE_SIZE && (
            <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-600">
              <span>
                {total} documento(s) · página {page} de {totalPages}
              </span>
              <div className="flex gap-1">
                <Button variant="secondary" size="icon" onClick={() => setPage((p) => p - 1)} disabled={page === 1} aria-label="Página anterior">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= totalPages}
                  aria-label="Próxima página"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </section>
      </div>

      <UploadModal
        open={modal === 'upload'}
        folderName={current?.path ?? ''}
        onClose={() => setModal(null)}
        onSubmit={upload}
      />
      <SendModal open={modal === 'send'} count={selected.size} onClose={() => setModal(null)} onSend={send} />
      <Modal
        open={modal === 'delete'}
        onClose={() => setModal(null)}
        title="Excluir documentos?"
        description={`${selected.size} documento(s) serão removidos desta pasta.`}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)}>
              Cancelar
            </Button>
            <Button variant="danger" loading={remove.isPending} onClick={() => remove.mutate([...selected])}>
              Excluir
            </Button>
          </>
        }
      />
    </div>
  )
}
