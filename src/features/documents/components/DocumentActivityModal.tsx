import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, Circle, Download, Eye, Mail, Trash2, Upload } from 'lucide-react'
import { Badge, EmptyState, Modal, Skeleton, Tabs } from '@/components/ui'
import { useActiveCompany } from '@/features/companies/ActiveCompanyContext'
import { formatDateTime } from '@/lib/format'
import type { DocumentEventType, DocumentItem } from '@/types/domain'
import { documentKeys, documentTrackingApi } from '../api'

const EVENT: Record<DocumentEventType, { label: string; icon: typeof Eye }> = {
  Upload: { label: 'Adicionou o documento', icon: Upload },
  Visualizacao: { label: 'Visualizou', icon: Eye },
  Download: { label: 'Baixou', icon: Download },
  Envio: { label: 'Enviou por e-mail', icon: Mail },
  Exclusao: { label: 'Excluiu', icon: Trash2 },
}

/** Quem visualizou/baixou o documento e o histórico de ações (somente escritório). */
export function DocumentActivityModal({ doc, onClose }: { doc: DocumentItem | null; onClose: () => void }) {
  const { company } = useActiveCompany()
  const companyId = company?.id ?? ''
  const [tab, setTab] = useState<'access' | 'history'>('access')

  const access = useQuery({
    queryKey: documentKeys.access(companyId, doc?.id ?? ''),
    queryFn: () => documentTrackingApi.access(companyId, doc!.id),
    enabled: !!doc && !!companyId,
  })
  const history = useQuery({
    queryKey: documentKeys.history(companyId, doc?.id ?? ''),
    queryFn: () => documentTrackingApi.history(companyId, doc!.id),
    enabled: !!doc && !!companyId && tab === 'history',
  })

  const summary = access.data
  const side = summary?.origin === 'client' ? 'do escritório' : 'da empresa'
  const description = summary
    ? `${doc?.name} · aberto por ${summary.recipientsWhoViewed} de ${summary.recipients} usuário${summary.recipients === 1 ? '' : 's'} ${side}`
    : doc?.name

  const close = () => {
    setTab('access')
    onClose()
  }

  return (
    <Modal open={!!doc} onClose={close} title="Acompanhamento do documento" description={description} size="lg">
      <Tabs
        className="mb-3"
        items={[
          { value: 'access', label: 'Quem acessou' },
          { value: 'history', label: 'Histórico' },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'access' ? (
        access.isLoading ? (
          <Loading />
        ) : !summary || summary.users.length === 0 ? (
          <EmptyState
            title={summary?.origin === 'client' ? 'Ninguém do escritório abriu ainda' : 'A empresa não tem usuários no portal'}
            description={summary?.origin === 'client' ? undefined : 'Cadastre usuários do cliente para acompanhar a entrega.'}
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {summary.users.map((u) => (
              <li key={u.userId} className="flex items-center gap-3 py-2.5 text-sm">
                {u.viewedAt ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-label="Visualizou" />
                ) : (
                  <Circle className="h-4 w-4 shrink-0 text-slate-300" aria-label="Não visualizou" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 truncate text-ink">
                    {u.name}
                    {!u.isRecipient && <Badge>{u.isOffice ? 'Escritório' : 'Empresa'}</Badge>}
                  </p>
                  <p className="truncate text-xs text-slate-500">{u.email}</p>
                </div>
                <div className="text-right text-xs text-slate-500">
                  {u.viewedAt ? (
                    <>
                      <p>Visualizou em {formatDateTime(u.viewedAt)}</p>
                      <p>
                        {u.downloads > 0
                          ? `Baixou ${u.downloads}x · último em ${formatDateTime(u.lastDownloadAt)}`
                          : 'Não baixou'}
                      </p>
                    </>
                  ) : (
                    <p>Ainda não abriu</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )
      ) : history.isLoading ? (
        <Loading />
      ) : !history.data?.length ? (
        <EmptyState title="Sem registros no histórico" />
      ) : (
        <ol className="relative space-y-3 border-l border-slate-200 pl-5">
          {history.data.map((e) => {
            const { label, icon: Icon } = EVENT[e.type] ?? { label: e.type, icon: Eye }
            return (
              <li key={e.id} className="relative text-sm">
                <span className="absolute -left-[29px] flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white">
                  <Icon className="h-3.5 w-3.5 text-brand-600" />
                </span>
                <p className="text-ink">
                  <span className="font-medium">{e.userName}</span> {label.toLowerCase()}
                  <span className="text-slate-500"> · {e.isOffice ? 'escritório' : 'empresa'}</span>
                </p>
                <p className="text-xs text-slate-500">
                  {formatDateTime(e.at)}
                  {e.detail && ` · ${e.detail}`}
                </p>
              </li>
            )
          })}
        </ol>
      )}
    </Modal>
  )
}

function Loading() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-10" />
      <Skeleton className="h-10" />
      <Skeleton className="h-10" />
    </div>
  )
}
