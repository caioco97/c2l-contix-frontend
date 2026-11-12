import { Skeleton } from '@/components/ui'
import { RequestTypeCard } from '../components/RequestTypeCard'
import { useRequestTypes } from '../hooks'

export function CatalogPage() {
  const { data = [], isLoading } = useRequestTypes()

  return (
    <section>
      <h1 className="mb-4 text-xl font-semibold text-ink">Solicitação de Serviço</h1>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading
          ? Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-44 rounded-xl" />)
          : data.map((t) => <RequestTypeCard key={t.code} type={t} />)}
      </div>
    </section>
  )
}
