import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button, Checkbox, FormField, Input, Modal } from '@/components/ui'
import type { FolderInput } from '../api'

const schema = z.object({
  name: z.string().trim().min(1, 'Informe o nome da pasta.').max(100, 'Máximo de 100 caracteres.'),
  clientCanUpload: z.boolean(),
})

interface FolderFormModalProps {
  open: boolean
  /** Pasta em edição; sem ela, cria uma subpasta de `parentPath` (ou uma pasta raiz). */
  initial?: FolderInput
  parentPath?: string
  onClose: () => void
  onSubmit: (values: FolderInput) => Promise<void>
}

export function FolderFormModal({ open, initial, parentPath, onClose, onSubmit }: FolderFormModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FolderInput>({ resolver: zodResolver(schema), defaultValues: { name: '', clientCanUpload: false } })

  useEffect(() => {
    if (open) reset(initial ?? { name: '', clientCanUpload: false })
  }, [open, initial, reset])

  const submit = handleSubmit(onSubmit)
  const editing = !!initial

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Editar pasta' : parentPath ? 'Nova subpasta' : 'Nova pasta'}
      description={!editing && parentPath ? `Dentro de ${parentPath}` : undefined}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={submit} loading={isSubmitting}>
            Salvar
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        <FormField label="Nome" htmlFor="folder-name" error={errors.name?.message}>
          <Input id="folder-name" autoFocus invalid={!!errors.name} {...register('name')} />
        </FormField>
        <label className="flex items-start gap-2.5 text-sm text-slate-700">
          <Checkbox className="mt-0.5" {...register('clientCanUpload')} />
          <span>
            A empresa pode enviar arquivos nesta pasta
            <span className="block text-xs text-slate-500">O escritório é avisado a cada envio.</span>
          </span>
        </label>
      </form>
    </Modal>
  )
}
