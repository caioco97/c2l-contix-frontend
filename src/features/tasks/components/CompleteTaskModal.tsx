import { useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Button, FormField, Input, Modal, Select, Textarea, useToast } from '@/components/ui'
import { documentKeys, documentsApi, folderPaths } from '@/features/documents/api'
import { AttachmentPicker } from '@/features/requests/components/AttachmentPicker'
import { getErrorMessage } from '@/lib/api'
import type { Task, TaskDetail } from '@/types/domain'
import { tasksApi } from '../api'

interface Props {
  task: Pick<Task, 'id' | 'companyId' | 'period' | 'legalDueDate'>
  open: boolean
  onClose: () => void
  onDone: (detail: TaskDetail) => void
}

/**
 * Concluir a tarefa, com entrega opcional: os arquivos anexados são publicados na pasta escolhida
 * da empresa (com competência e vencimento) e o cliente é avisado como em qualquer documento novo.
 */
export function CompleteTaskModal({ task, open, onClose, onDone }: Props) {
  const toast = useToast()
  const [message, setMessage] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [folderId, setFolderId] = useState('')
  // Montado a cada abertura: competência e vencimento sugeridos pela tarefa.
  const [period, setPeriod] = useState(task.period?.slice(0, 7) ?? '')
  const [dueDate, setDueDate] = useState(task.legalDueDate ?? '')

  const folders = useQuery({
    queryKey: documentKeys.folders(task.companyId),
    queryFn: () => documentsApi.folders(task.companyId),
    enabled: open && files.length > 0,
  })
  const folderOptions = useMemo(
    () =>
      [...folderPaths(folders.data ?? []).entries()]
        .map(([value, label]) => ({ value, label }))
        .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR')),
    [folders.data],
  )

  const complete = useMutation({
    mutationFn: () =>
      tasksApi.complete(task.companyId, task.id, {
        message,
        files,
        folderId: folderId || null,
        period: period ? `${period}-01` : null,
        dueDate: dueDate || null,
      }),
    onSuccess: (detail) => {
      toast.success(
        files.length > 0 ? `Tarefa concluída e ${files.length} arquivo(s) entregue(s) ao cliente.` : 'Tarefa concluída.',
      )
      onDone(detail)
    },
    onError: (e) => toast.error(getErrorMessage(e, 'Não foi possível concluir a tarefa.')),
  })

  const needsFolder = files.length > 0 && !folderId

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Concluir tarefa"
      description="Anexe o que vai para o cliente (guias, relatórios, recibos) para entregar junto. Sem arquivos, a tarefa só é concluída."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Voltar
          </Button>
          <Button onClick={() => complete.mutate()} loading={complete.isPending} disabled={needsFolder}>
            {files.length > 0 ? 'Concluir e entregar' : 'Concluir'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <AttachmentPicker files={files} onChange={setFiles} label="Arquivos para o cliente" />
        {files.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <FormField label="Pasta da empresa" htmlFor="complete-folder" required>
                <Select
                  id="complete-folder"
                  placeholder={folders.isLoading ? 'Carregando pastas…' : 'Escolha a pasta'}
                  value={folderId}
                  onChange={(e) => setFolderId(e.target.value)}
                  options={folderOptions}
                />
              </FormField>
            </div>
            <FormField label="Competência" htmlFor="complete-period">
              <Input id="complete-period" type="month" value={period} onChange={(e) => setPeriod(e.target.value)} />
            </FormField>
            <FormField label="Vencimento" htmlFor="complete-due" hint="O cliente é lembrado antes desta data.">
              <Input id="complete-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </FormField>
          </div>
        )}
        <FormField label="Observação (opcional)" htmlFor="complete-message">
          <Textarea id="complete-message" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} />
        </FormField>
      </div>
    </Modal>
  )
}
