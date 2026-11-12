import { Link } from 'react-router-dom'
import { ClipboardList } from 'lucide-react'
import type { ServiceRequestType } from '@/types/domain'
import { requestIcons } from '../meta'

export function RequestTypeCard({ type }: { type: ServiceRequestType }) {
  const Icon = requestIcons[type.code] ?? ClipboardList
  return (
    <Link
      to={`/portal/solicitacoes/nova/${type.code}`}
      className="group flex flex-col items-center gap-3 rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 transition-colors group-hover:bg-brand-600 group-hover:text-white">
        <Icon className="h-7 w-7" strokeWidth={1.6} />
      </span>
      <span className="text-sm font-semibold text-ink">{type.name}</span>
      <span className="text-xs leading-snug text-slate-500">{type.description}</span>
    </Link>
  )
}
