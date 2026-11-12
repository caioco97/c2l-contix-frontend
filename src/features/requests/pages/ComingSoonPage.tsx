import { Construction } from 'lucide-react'
import { EmptyState } from '@/components/ui'

export function ComingSoonPage({ title }: { title: string }) {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-ink">{title}</h1>
      <EmptyState
        icon={<Construction className="h-8 w-8" />}
        title="Em construção"
        description="Esta área faz parte do backlog e será liberada nas próximas entregas."
        className="bg-white py-14"
      />
    </div>
  )
}
