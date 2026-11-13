import type { Task, TaskStatus } from '@/types/domain'

export const taskHref = (t: Pick<Task, 'companyId' | 'id'>) => `/tarefas/${t.companyId}/${t.id}`

type Tone = 'info' | 'warning' | 'success' | 'neutral' | 'brand'

export const taskStatusMeta: Record<TaskStatus, { label: string; tone: Tone; action: string }> = {
  Pending: { label: 'Pendente', tone: 'info', action: 'Voltar para pendente' },
  InProgress: { label: 'Em andamento', tone: 'brand', action: 'Iniciar' },
  Done: { label: 'Concluída', tone: 'success', action: 'Concluir' },
  Canceled: { label: 'Cancelada', tone: 'neutral', action: 'Cancelar tarefa' },
}

export const TASK_STATUS_OPTIONS = (Object.keys(taskStatusMeta) as TaskStatus[]).map((s) => ({
  value: s,
  label: taskStatusMeta[s].label,
}))
