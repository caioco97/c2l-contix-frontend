import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Badge, Button, Table, TBody, Td, Th, THead, Tr } from '@/components/ui'
import { cn } from '@/lib/cn'
import { formatDate } from '@/lib/format'
import type { ServiceRequest } from '@/types/domain'
import { departmentLabels, statusMeta } from '../meta'

interface Props {
  items: ServiceRequest[]
  /** Visão do escritório: mostra empresa e responsável. */
  office?: boolean
  hrefOf: (r: ServiceRequest) => string
}

export function RequestsTable({ items, office, hrefOf }: Props) {
  const navigate = useNavigate()
  return (
    <Table>
      <THead>
        <tr>
          <Th>Nº</Th>
          <Th>Assunto</Th>
          {office && <Th>Empresa</Th>}
          <Th>Departamento</Th>
          <Th>Status</Th>
          {office && <Th>Responsável</Th>}
          <Th>Prazo</Th>
          <Th>Atualizada</Th>
        </tr>
      </THead>
      <TBody>
        {items.map((r) => {
          const href = hrefOf(r)
          const status = statusMeta[r.status]
          return (
            <Tr
              key={r.id}
              onClick={() => navigate(href)}
              onKeyDown={(e) => e.key === 'Enter' && navigate(href)}
              tabIndex={0}
            >
              <Td className="font-mono text-xs text-slate-500">#{r.number}</Td>
              <Td>
                <p className="font-medium text-ink">{r.subject}</p>
                <p className="text-xs text-slate-500">{r.typeName}</p>
              </Td>
              {office && <Td>{r.companyName}</Td>}
              <Td>{departmentLabels[r.department]}</Td>
              <Td>
                <Badge tone={status.tone}>{office ? status.officeLabel : status.label}</Badge>
              </Td>
              {office && <Td className={cn(!r.assigneeName && 'text-slate-400')}>{r.assigneeName ?? 'Sem responsável'}</Td>}
              <Td className={cn('whitespace-nowrap', r.isOverdue && 'font-semibold text-red-600')}>
                {formatDate(r.dueDate)}
                {r.isOverdue && <span className="ml-1 text-xs">(atrasada)</span>}
              </Td>
              <Td className="whitespace-nowrap">{formatDate(r.updatedAt)}</Td>
            </Tr>
          )
        })}
      </TBody>
    </Table>
  )
}

export function Pager({
  page,
  total,
  pageSize,
  onPage,
  noun = ['solicitação', 'solicitações'],
}: {
  page: number
  total: number
  pageSize: number
  onPage: (p: number) => void
  /** Singular e plural do que está sendo paginado. */
  noun?: [string, string]
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  if (pages <= 1) return null
  return (
    <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2 text-sm text-slate-600">
      <span>
        {total} {total === 1 ? noun[0] : noun[1]} · página {page} de {pages}
      </span>
      <div className="flex gap-1">
        <Button variant="ghost" size="icon" aria-label="Página anterior" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" aria-label="Próxima página" disabled={page >= pages} onClick={() => onPage(page + 1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
