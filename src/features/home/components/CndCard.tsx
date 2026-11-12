import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Download, ShieldCheck } from 'lucide-react'
import { Button, Card, CardBody, CardHeader, EmptyState, Skeleton } from '@/components/ui'
import { cndApi, cndKeys } from '@/features/cnd/api'
import { CndStatusBadge } from '@/features/cnd/components/CndStatusBadge'
import { expiryText } from '@/features/cnd/format'
import { useDownloadCnd } from '@/features/cnd/hooks'
import { formatDate } from '@/lib/format'

export function CndCard({ companyId }: { companyId: string }) {
  const { data = [], isLoading } = useQuery({ queryKey: cndKeys.list(companyId), queryFn: () => cndApi.list(companyId) })
  const download = useDownloadCnd()

  return (
    <Card>
      <CardHeader
        title="CND"
        icon={<ShieldCheck className="h-5 w-5" />}
        action={
          data.length > 0 && (
            <Link to="/certidoes" className="text-sm font-medium text-brand-700 hover:underline">
              Ver todas
            </Link>
          )
        }
      />
      <CardBody>
        {isLoading ? (
          <Skeleton className="h-20" />
        ) : data.length === 0 ? (
          <EmptyState title="Nenhuma certidão cadastrada para esta empresa" />
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{c.typeName}</p>
                  <p className="text-xs text-slate-500" title={expiryText(c)}>
                    Válida até {formatDate(c.validUntil)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <CndStatusBadge status={c.status} />
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
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  )
}
