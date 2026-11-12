import { Badge } from '@/components/ui'
import type { CndStatus } from '@/types/domain'

const STATUS: Record<CndStatus, { label: string; tone: 'success' | 'warning' | 'danger' }> = {
  Regular: { label: 'Regular', tone: 'success' },
  Expiring: { label: 'Vence em breve', tone: 'warning' },
  Expired: { label: 'Vencida', tone: 'danger' },
  Irregular: { label: 'Irregular', tone: 'danger' },
}

export function CndStatusBadge({ status }: { status: CndStatus }) {
  const s = STATUS[status]
  return <Badge tone={s.tone}>{s.label}</Badge>
}
