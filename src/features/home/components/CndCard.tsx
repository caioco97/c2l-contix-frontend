import { useQuery } from '@tanstack/react-query'
import { ShieldCheck } from 'lucide-react'
import { Badge, Card, CardBody, CardHeader, EmptyState, Skeleton } from '@/components/ui'
import { cndApi, cndKeys } from '@/features/cnd/api'
import { formatDate } from '@/lib/format'
import type { CndStatus } from '@/types/domain'

const statusBadge: Record<CndStatus, { label: string; tone: 'success' | 'warning' | 'danger' }> = {
  Regular: { label: 'Regular', tone: 'success' },
  Expiring: { label: 'Vence em breve', tone: 'warning' },
  Expired: { label: 'Vencida', tone: 'danger' },
  Irregular: { label: 'Irregular', tone: 'danger' },
}

export function CndCard({ companyId }: { companyId: string }) {
  const { data = [], isLoading } = useQuery({ queryKey: cndKeys.list(companyId), queryFn: () => cndApi.list(companyId) })

  return (
    <Card>
      <CardHeader title="CND" icon={<ShieldCheck className="h-5 w-5" />} />
      <CardBody>
        {isLoading ? (
          <Skeleton className="h-20" />
        ) : data.length === 0 ? (
          <EmptyState title="Nenhuma certidão cadastrada para esta empresa" />
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.map((c) => {
              const s = statusBadge[c.status]
              return (
                <li key={c.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">{c.type}</p>
                    <p className="text-xs text-slate-500">Válida até {formatDate(c.validUntil)}</p>
                  </div>
                  <Badge tone={s.tone}>{s.label}</Badge>
                </li>
              )
            })}
          </ul>
        )}
      </CardBody>
    </Card>
  )
}
