import { useNavigate } from 'react-router-dom'
import { MessageSquare, Paperclip } from 'lucide-react'
import { Badge, Table, TBody, Td, Th, THead, Tr } from '@/components/ui'
import { departmentLabels } from '@/features/requests/meta'
import { cn } from '@/lib/cn'
import { formatDate } from '@/lib/format'
import type { Task } from '@/types/domain'
import { taskHref, taskStatusMeta } from '../meta'

interface Props {
  items: Task[]
  /** Mostra a coluna Empresa (lista geral). */
  showCompany?: boolean
}

export function TasksTable({ items, showCompany }: Props) {
  const navigate = useNavigate()
  return (
    <Table>
      <THead>
        <tr>
          <Th>Nº</Th>
          <Th>Tarefa</Th>
          {showCompany && <Th>Empresa</Th>}
          <Th>Departamento</Th>
          <Th>Responsável</Th>
          <Th>Status</Th>
          <Th>Prazo interno</Th>
          <Th>Prazo legal</Th>
        </tr>
      </THead>
      <TBody>
        {items.map((t) => {
          const href = taskHref(t)
          const status = taskStatusMeta[t.status]
          return (
            <Tr
              key={t.id}
              className="cursor-pointer"
              onClick={() => navigate(href)}
              onKeyDown={(e) => e.key === 'Enter' && navigate(href)}
              tabIndex={0}
            >
              <Td className="font-mono text-xs text-slate-500">#{t.number}</Td>
              <Td>
                <p className="font-medium text-ink">{t.title}</p>
                {(t.comments > 0 || t.attachments > 0) && (
                  <p className="mt-0.5 flex gap-3 text-xs text-slate-500">
                    {t.comments > 0 && (
                      <span className="inline-flex items-center gap-1" title="Comentários">
                        <MessageSquare className="h-3 w-3" />
                        {t.comments}
                      </span>
                    )}
                    {t.attachments > 0 && (
                      <span className="inline-flex items-center gap-1" title="Anexos">
                        <Paperclip className="h-3 w-3" />
                        {t.attachments}
                      </span>
                    )}
                  </p>
                )}
              </Td>
              {showCompany && <Td>{t.companyName}</Td>}
              <Td>{departmentLabels[t.department]}</Td>
              <Td>{t.assigneeName}</Td>
              <Td>
                <Badge tone={status.tone}>{status.label}</Badge>
              </Td>
              <Td className={cn('whitespace-nowrap', t.isOverdue && 'font-semibold text-red-600')}>
                {formatDate(t.internalDueDate)}
                {t.isOverdue && <span className="ml-1 text-xs">(atrasada)</span>}
              </Td>
              <Td className={cn('whitespace-nowrap', t.isLegalOverdue && 'font-semibold text-red-600')}>
                {t.legalDueDate ? formatDate(t.legalDueDate) : '—'}
                {t.isLegalOverdue && <span className="ml-1 text-xs">(vencido)</span>}
              </Td>
            </Tr>
          )
        })}
      </TBody>
    </Table>
  )
}
