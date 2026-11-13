import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { TaskDetailView } from '../components/TaskDetailView'

export function TaskPage() {
  const { companyId = '', taskId = '' } = useParams()
  return (
    <div className="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6">
      <Link to="/tarefas" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline">
        <ArrowLeft className="h-4 w-4" />
        Tarefas
      </Link>
      <TaskDetailView companyId={companyId} taskId={taskId} />
    </div>
  )
}
