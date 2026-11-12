import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Inbox, Plus } from 'lucide-react'
import { Badge, Button, Card, EmptyState, Skeleton, Table, TBody, Td, Th, THead, Tr } from '@/components/ui'
import { useActiveCompany } from '@/features/companies/ActiveCompanyContext'
import { formatDate } from '@/lib/format'
import { requestKeys, requestsApi } from '../api'
import { statusMeta } from '../meta'

export function MyRequestsPage() {
  const { company } = useActiveCompany()
  const companyId = company?.id ?? ''
  const { data = [], isLoading } = useQuery({
    queryKey: requestKeys.list(companyId),
    queryFn: () => requestsApi.list(companyId),
    enabled: !!companyId,
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-ink">Minhas solicitações</h1>
        <Link to="/portal">
          <Button size="sm">
            <Plus className="h-4 w-4" />
            Nova solicitação
          </Button>
        </Link>
      </div>
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="space-y-2 p-4">
            <Skeleton className="h-8" />
            <Skeleton className="h-8" />
          </div>
        ) : data.length === 0 ? (
          <div className="p-6">
            <EmptyState icon={<Inbox className="h-8 w-8" />} title="Nenhuma solicitação aberta para esta empresa." />
          </div>
        ) : (
          <Table>
            <THead>
              <tr>
                <Th>Nº</Th>
                <Th>Assunto</Th>
                <Th>Tipo</Th>
                <Th>Departamento</Th>
                <Th>Status</Th>
                <Th>Atualizada</Th>
              </tr>
            </THead>
            <TBody>
              {data.map((r) => (
                <Tr key={r.id}>
                  <Td className="font-mono text-xs text-slate-500">#{r.number}</Td>
                  <Td className="font-medium text-ink">{r.subject}</Td>
                  <Td>{r.typeName}</Td>
                  <Td>{r.department}</Td>
                  <Td>
                    <Badge tone={statusMeta[r.status].tone}>{statusMeta[r.status].label}</Badge>
                  </Td>
                  <Td className="whitespace-nowrap">{formatDate(r.updatedAt)}</Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </div>
  )
}
