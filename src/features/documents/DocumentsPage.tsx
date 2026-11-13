import { useEffect, useMemo, useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ChevronLeft,
  ChevronRight,
  CirclePlus,
  Download,
  Eye,
  FileText,
  FolderPlus,
  Inbox,
  Mail,
  Pencil,
  Search,
  Trash2,
} from 'lucide-react'
import {
  Badge,
  Button,
  ConfirmModal,
  Checkbox,
  EmptyState,
  Input,
  Modal,
  SegmentedControl,
  Select,
  Skeleton,
  SortableTh,
  Table,
  TBody,
  Td,
  Th,
  THead,
  Tr,
  useToast,
} from '@/components/ui'
import { useAuth } from '@/features/auth/AuthContext'
import { CompanyContextBar, CompanyGate } from '@/features/companies/CompanySelector'
import { getErrorMessage } from '@/lib/api'
import { cn } from '@/lib/cn'
import { formatDate } from '@/lib/format'
import type { Company, DocumentFolder, DocumentItem, DocumentOrigin, ReadFilter } from '@/types/domain'
import {
  documentKeys,
  documentsApi,
  folderAdminApi,
  type DocumentQuery,
  type DocumentSortField,
  type FolderInput,
} from './api'
import { DocumentActivityModal } from './components/DocumentActivityModal'
import { FolderFormModal } from './components/FolderFormModal'
import { FolderTree } from './components/FolderTree'
import { SendModal } from './components/SendModal'
import { UploadModal, type UploadForm } from './components/UploadModal'
import { useDownloadDocuments } from './hooks'

const PAGE_SIZE = 10
/** Visão de todos os documentos enviados pela empresa, em qualquer pasta. */
const RECEIVED = 'recebidos'

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
  return (
    <>
      <CompanyContextBar width="wide" />
      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6">
        <CompanyGate purpose="ver, enviar e organizar os documentos">
          {(company) => <DocumentsWorkspace key={company.id} company={company} />}
        </CompanyGate>
      </div>
    </>
  )
}

function DocumentsWorkspace({ company }: { company: Company }) {
  const { folderId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useToast()
  const companyId = company.id
  const { user } = useAuth()
  const isOffice = !!user && user.role !== 'Client'
  const isReceived = folderId === RECEIVED

  const [filter, setFilter] = useState<ReadFilter>('all')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<DocumentSortField>('publishedAt')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [competence, setCompetence] = useState('')
  const [origin, setOrigin] = useState<DocumentOrigin | ''>('')
  const [modal, setModal] = useState<'upload' | 'delete' | 'send' | 'newFolder' | 'editFolder' | 'deleteFolder' | null>(null)
  const [activityDoc, setActivityDoc] = useState<DocumentItem | null>(null)
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
  const contextKey = `${companyId}|${folderId}|${filter}|${debouncedSearch}|${competence}|${origin}`
  const [prevContextKey, setPrevContextKey] = useState(contextKey)
  if (prevContextKey !== contextKey) {
    setPrevContextKey(contextKey)
    setPage(1)
    setSelected(new Set())
  }

  const query: DocumentQuery = {
    folderId: isReceived ? undefined : folderId,
    filter,
    search: debouncedSearch,
    competence: competence || undefined,
    origin: isReceived ? 'client' : origin || undefined,
    sortBy,
    sortDir,
    page,
    pageSize: PAGE_SIZE,
  }
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
        competence: values.competence || undefined,
        fromClient: !isOffice,
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
      const total = await documentsApi.send(companyId, { ids: [...selected], message })
      toast.success(total === 1 ? 'Documentos enviados para 1 usuário.' : `Documentos enviados para ${total} usuários.`)
      setModal(null)
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  const saveFolder = async (values: FolderInput) => {
    try {
      if (modal === 'editFolder' && current) {
        await folderAdminApi.update(companyId, current.folder.id, values)
        toast.success('Pasta atualizada.')
      } else {
        const id = await folderAdminApi.create(companyId, { ...values, parentId: current?.folder.id ?? null })
        toast.success(`Pasta ${values.name.trim()} criada.`)
        navigate(`/documentos/${id}`)
      }
      setModal(null)
      queryClient.invalidateQueries({ queryKey: documentKeys.folders(companyId) })
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  const removeFolder = useMutation({
    mutationFn: (id: string) => folderAdminApi.remove(companyId, id),
    onSuccess: () => {
      toast.success('Pasta excluída.')
      setModal(null)
      queryClient.invalidateQueries({ queryKey: documentKeys.folders(companyId) })
      navigate(current?.folder.parentId ? `/documentos/${current.folder.parentId}` : '/documentos', { replace: true })
    },
    onError: (e) => toast.error(getErrorMessage(e, 'Só é possível excluir pastas vazias.')),
  })

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

  const editingFolder = modal === 'editFolder' ? current?.folder : undefined
  const folderForm = useMemo(
    () => (editingFolder ? { name: editingFolder.name, clientCanUpload: !!editingFolder.clientCanUpload } : undefined),
    [editingFolder],
  )
  const hasSelection = selected.size > 0
  const columns = isOffice ? 9 : 8
  // O cliente só envia para pastas liberadas pelo escritório (nos mocks a flag não existe: libera).
  const canUpload = !!current && (user?.role !== 'Client' || current.folder.clientCanUpload !== false)
  const sortProps = (field: DocumentSortField) => ({
    active: sortBy === field,
    direction: sortDir,
    onSort: () => toggleSort(field),
  })

  return (
    <>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[240px_1fr]">
        <aside className="rounded-xl border border-slate-200 bg-white p-2 lg:self-start">
          {foldersQuery.isLoading ? (
            <div className="space-y-2 p-2">
              {Array.from({ length: 7 }, (_, i) => (
                <Skeleton key={i} className="h-8" />
              ))}
            </div>
          ) : (
            <>
              <FolderTree folders={folders} selectedId={folderId} onSelect={(f) => navigate(`/documentos/${f.id}`)} />
              <div className="mt-2 space-y-0.5 border-t border-slate-100 pt-2">
                <button
                  type="button"
                  onClick={() => navigate(`/documentos/${RECEIVED}`)}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm transition-colors',
                    isReceived ? 'bg-brand-50 font-semibold text-brand-800' : 'text-slate-700 hover:bg-slate-50',
                  )}
                >
                  <Inbox className={cn('h-4.5 w-4.5 shrink-0', isReceived ? 'text-brand-600' : 'text-slate-400')} />
                  {isOffice ? 'Enviados pela empresa' : 'Enviados ao escritório'}
                </button>
              </div>
            </>
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
            {isOffice && (
              <Button variant="onDark" size="sm" disabled={!hasSelection} onClick={() => setModal('send')}>
                <Mail className="h-4 w-4" />
                Enviar
              </Button>
            )}

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

          <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-2 text-sm">
            <span className="font-medium text-slate-600">
              {isReceived ? (isOffice ? 'Enviados pela empresa (todas as pastas)' : 'Enviados ao escritório (todas as pastas)') : (current?.path ?? '—')}
            </span>
            {isOffice && current && (
              <div className="flex items-center">
                <Button variant="ghost" size="icon" onClick={() => setModal('newFolder')} aria-label="Nova subpasta" title="Nova subpasta">
                  <FolderPlus className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setModal('editFolder')} aria-label="Editar pasta" title="Editar pasta">
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setModal('deleteFolder')}
                  aria-label="Excluir pasta"
                  title="Excluir pasta (somente vazia)"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
            {hasSelection && <span className="text-brand-700">{selected.size} selecionado(s)</span>}
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-500">Competência</span>
              <Input
                type="month"
                value={competence}
                onChange={(e) => setCompetence(e.target.value)}
                aria-label="Filtrar por competência"
                title="Competência"
                className="h-8 w-40"
              />
              {!isReceived && (
                <Select
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value as DocumentOrigin | '')}
                  aria-label="Filtrar por origem"
                  className="h-8 w-48 py-0"
                  options={[
                    { value: '', label: 'Todas as origens' },
                    { value: 'office', label: 'Publicados pelo escritório' },
                    { value: 'client', label: isOffice ? 'Enviados pela empresa' : 'Enviados por mim/empresa' },
                  ]}
                />
              )}
              {(competence || origin) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setCompetence('')
                    setOrigin('')
                  }}
                >
                  Limpar
                </Button>
              )}
            </div>
          </div>

          <Table>
            <THead>
              <tr>
                <Th className="w-10">
                  <Checkbox checked={allSelected} onChange={toggleAll} aria-label="Selecionar todos" disabled={!docs.length} />
                </Th>
                <SortableTh {...sortProps('name')}>Nome</SortableTh>
                {isOffice && <Th className="w-20">Acessos</Th>}
                <Th>Comentários</Th>
                <SortableTh {...sortProps('competence')}>Competência</SortableTh>
                <SortableTh {...sortProps('publishedAt')}>Publicação</SortableTh>
                <SortableTh {...sortProps('dueDate')}>Vencimento</SortableTh>
                <Th>Adicionado por</Th>
                <SortableTh {...sortProps('modifiedAt')}>Modificado</SortableTh>
              </tr>
            </THead>
            <TBody>
              {docsQuery.isLoading ? (
                Array.from({ length: 4 }, (_, i) => (
                  <tr key={i}>
                    <Td colSpan={columns}>
                      <Skeleton className="h-5" />
                    </Td>
                  </tr>
                ))
              ) : docs.length === 0 ? (
                <tr>
                  <Td colSpan={columns} className="p-6">
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
                      {(doc.origin === 'client' || isReceived) && (
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 pl-6 text-xs text-slate-500">
                          {doc.origin === 'client' && (
                            <Badge tone="info" className="whitespace-nowrap">
                              {isOffice ? 'Enviado pela empresa' : 'Enviado ao escritório'}
                            </Badge>
                          )}
                          {isReceived && <span className="whitespace-nowrap">{doc.folderPath}</span>}
                        </div>
                      )}
                    </Td>
                    {isOffice && (
                      <Td>
                        <button
                          type="button"
                          onClick={() => setActivityDoc(doc)}
                          className={cn(
                            'flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors hover:bg-slate-100',
                            doc.recipientViews ? 'text-emerald-700' : 'text-slate-500',
                          )}
                          title={
                            doc.recipientViews
                              ? `Aberto por ${doc.recipientViews} usuário(s) ${doc.origin === 'client' ? 'do escritório' : 'da empresa'}`
                              : 'Ninguém abriu ainda · ver histórico'
                          }
                          aria-label={`Acompanhamento de ${doc.name}`}
                        >
                          <Eye className="h-4 w-4" />
                          {doc.recipientViews ?? 0}
                        </button>
                      </Td>
                    )}
                    <Td className="max-w-44 truncate text-slate-500" title={doc.comment ?? undefined}>{doc.comment ?? '—'}</Td>
                    <Td className="whitespace-nowrap">{doc.competence ? formatDate(doc.competence, 'MM/yyyy') : '—'}</Td>
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
      <DocumentActivityModal doc={activityDoc} onClose={() => setActivityDoc(null)} />
      <FolderFormModal
        open={modal === 'newFolder' || modal === 'editFolder'}
        initial={folderForm}
        parentPath={current?.path}
        onClose={() => setModal(null)}
        onSubmit={saveFolder}
      />
      <ConfirmModal
        open={modal === 'deleteFolder'}
        title="Excluir pasta?"
        description={`A pasta ${current?.path ?? ''} será excluída. Só é possível excluir pastas sem documentos e sem subpastas.`}
        loading={removeFolder.isPending}
        onConfirm={() => current && removeFolder.mutate(current.folder.id)}
        onClose={() => setModal(null)}
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
    </>
  )
}
