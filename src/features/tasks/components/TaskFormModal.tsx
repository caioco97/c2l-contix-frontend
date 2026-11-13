import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { Button, FormField, Input, Modal, Select, Textarea } from '@/components/ui'
import { useAuth } from '@/features/auth/AuthContext'
import { companiesApi } from '@/features/companies/api'
import { requestKeys, requestsApi } from '@/features/requests/api'
import { AttachmentPicker } from '@/features/requests/components/AttachmentPicker'
import { DEPARTMENTS } from '@/features/requests/meta'
import type { TaskDetail, TaskInput } from '@/types/domain'

const schema = z
  .object({
    companyId: z.string().min(1, 'Selecione a empresa.'),
    title: z.string().trim().min(1, 'Informe o título.').max(200, 'Máximo de 200 caracteres.'),
    description: z.string().max(5000, 'Máximo de 5000 caracteres.'),
    department: z.enum(['Contabil', 'Fiscal', 'Pessoal', 'Societario', 'Financeiro'], 'Selecione o departamento.'),
    assigneeId: z.string().min(1, 'Selecione o responsável.'),
    internalDueDate: z.string().min(1, 'Informe o prazo interno.'),
    legalDueDate: z.string(),
  })
  .refine((v) => !v.legalDueDate || !v.internalDueDate || v.internalDueDate <= v.legalDueDate, {
    path: ['internalDueDate'],
    message: 'O prazo interno não pode ser posterior ao prazo legal.',
  })
type FormValues = z.infer<typeof schema>

function defaults(task: TaskDetail | null | undefined, companyId: string | undefined, userId: string | undefined): FormValues {
  return {
    companyId: task?.companyId ?? companyId ?? '',
    title: task?.title ?? '',
    description: task?.description ?? '',
    department: task?.department ?? ('' as FormValues['department']),
    assigneeId: task?.assigneeId ?? userId ?? '',
    internalDueDate: task?.internalDueDate ?? '',
    legalDueDate: task?.legalDueDate ?? '',
  }
}

interface Props {
  open: boolean
  /** Tarefa em edição; sem ela, cria uma nova. */
  task?: TaskDetail | null
  /** Empresa fixa (aba Tarefas da empresa). Sem ela, o usuário escolhe. */
  companyId?: string
  onClose: () => void
  onSubmit: (companyId: string, input: TaskInput, attachments: File[]) => Promise<void>
}

export function TaskFormModal({ open, task, companyId, onClose, onSubmit }: Props) {
  const { user } = useAuth()
  const [files, setFiles] = useState<File[]>([])
  const fixedCompany = !!task || !!companyId
  const companies = useQuery({ queryKey: ['companies', 'mine'], queryFn: companiesApi.listMine, enabled: open && !fixedCompany })
  const users = useQuery({ queryKey: requestKeys.officeUsers, queryFn: requestsApi.officeUsers, staleTime: 5 * 60_000, enabled: open })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: defaults(task, companyId, user?.id) })

  useEffect(() => {
    if (open) reset(defaults(task, companyId, user?.id))
  }, [open, task, companyId, user?.id, reset])

  const submit = handleSubmit(async (v) => {
    await onSubmit(
      v.companyId,
      {
        title: v.title.trim(),
        description: v.description.trim() || null,
        department: v.department,
        assigneeId: v.assigneeId,
        internalDueDate: v.internalDueDate,
        legalDueDate: v.legalDueDate || null,
      },
      files,
    )
    setFiles([])
  })

  const close = () => {
    setFiles([])
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title={task ? `Editar tarefa #${task.number}` : 'Nova tarefa'}
      description={task ? task.companyName : 'Tarefa interna do escritório. O cliente não vê.'}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Cancelar
          </Button>
          <Button onClick={submit} loading={isSubmitting}>
            {task ? 'Salvar' : 'Criar tarefa'}
          </Button>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
        {!fixedCompany && (
          <div className="sm:col-span-2">
            <FormField label="Empresa" htmlFor="task-company" error={errors.companyId?.message} required>
              <Select
                id="task-company"
                placeholder={companies.isLoading ? 'Carregando...' : 'Selecione a empresa'}
                invalid={!!errors.companyId}
                options={(companies.data ?? []).map((c) => ({ value: c.id, label: c.tradeName || c.legalName }))}
                {...register('companyId')}
              />
            </FormField>
          </div>
        )}
        <div className="sm:col-span-2">
          <FormField label="Título" htmlFor="task-title" error={errors.title?.message} required>
            <Input id="task-title" invalid={!!errors.title} placeholder="Ex.: Apuração do ICMS 10/2026" {...register('title')} />
          </FormField>
        </div>
        <FormField label="Departamento" htmlFor="task-department" error={errors.department?.message} required>
          <Select
            id="task-department"
            placeholder="Selecione"
            invalid={!!errors.department}
            options={DEPARTMENTS}
            {...register('department')}
          />
        </FormField>
        <FormField label="Responsável" htmlFor="task-assignee" error={errors.assigneeId?.message} required>
          <Select
            id="task-assignee"
            placeholder={users.isLoading ? 'Carregando...' : 'Selecione'}
            invalid={!!errors.assigneeId}
            options={(users.data ?? []).map((u) => ({ value: u.id, label: u.name }))}
            {...register('assigneeId')}
          />
        </FormField>
        <FormField
          label="Prazo interno"
          htmlFor="task-internal"
          error={errors.internalDueDate?.message}
          hint="Data combinada no escritório para entregar."
          required
        >
          <Input id="task-internal" type="date" invalid={!!errors.internalDueDate} {...register('internalDueDate')} />
        </FormField>
        <FormField label="Prazo legal" htmlFor="task-legal" error={errors.legalDueDate?.message} hint="Vencimento da obrigação, se houver.">
          <Input id="task-legal" type="date" invalid={!!errors.legalDueDate} {...register('legalDueDate')} />
        </FormField>
        <div className="sm:col-span-2">
          <FormField label="Descrição" htmlFor="task-description" error={errors.description?.message}>
            <Textarea id="task-description" rows={4} invalid={!!errors.description} {...register('description')} />
          </FormField>
        </div>
        {!task && (
          <div className="sm:col-span-2">
            <AttachmentPicker files={files} onChange={setFiles} />
          </div>
        )}
        <button type="submit" hidden />
      </form>
    </Modal>
  )
}
