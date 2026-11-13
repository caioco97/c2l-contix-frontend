import { useRef, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { FileUp, Trash2, UploadCloud } from 'lucide-react'
import { Button, FormField, Input, Modal, Textarea } from '@/components/ui'
import { cn } from '@/lib/cn'
import { formatBytes } from '@/lib/format'

const MAX_SIZE = 25 * 1024 * 1024
const ACCEPT = '.pdf,.xml,.xlsx,.xls,.csv,.doc,.docx,.jpg,.jpeg,.png,.zip,.txt'

const schema = z.object({
  files: z
    .array(z.instanceof(File))
    .min(1, 'Selecione pelo menos um arquivo.')
    .refine((files) => files.every((f) => f.size <= MAX_SIZE), 'Cada arquivo pode ter no máximo 25 MB.'),
  comment: z.string().max(500, 'Máximo de 500 caracteres.'),
  dueDate: z.string(),
  /** yyyy-MM */
  competence: z.string(),
})
export type UploadForm = z.infer<typeof schema>

interface UploadModalProps {
  open: boolean
  folderName: string
  onClose: () => void
  onSubmit: (values: UploadForm) => Promise<void>
}

export function UploadModal({ open, folderName, onClose, onSubmit }: UploadModalProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const {
    register,
    handleSubmit,
    setValue,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UploadForm>({ resolver: zodResolver(schema), defaultValues: { files: [], comment: '', dueDate: '', competence: '' } })
  const files = useWatch({ control, name: 'files' })

  const addFiles = (list: FileList | null) => {
    if (!list) return
    setValue('files', [...files, ...Array.from(list)], { shouldValidate: true })
  }

  const close = () => {
    reset()
    onClose()
  }

  const submit = handleSubmit(async (values) => {
    await onSubmit(values)
    reset()
  })

  return (
    <Modal
      open={open}
      onClose={close}
      title="Adicionar documentos"
      description={`Pasta: ${folderName}`}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Cancelar
          </Button>
          <Button onClick={submit} loading={isSubmitting}>
            <FileUp className="h-4 w-4" />
            Enviar {files.length > 0 && `(${files.length})`}
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            addFiles(e.dataTransfer.files)
          }}
          onClick={() => inputRef.current?.click()}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors',
            dragging ? 'border-brand-500 bg-brand-50' : 'border-slate-300 hover:border-brand-400 hover:bg-slate-50',
            errors.files && 'border-red-300',
          )}
        >
          <UploadCloud className="h-8 w-8 text-brand-600" />
          <p className="text-sm font-medium text-ink">Arraste arquivos aqui ou clique para selecionar</p>
          <p className="text-xs text-slate-500">PDF, XML, planilhas, imagens e ZIP · até 25 MB cada</p>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ACCEPT}
            className="hidden"
            onChange={(e) => {
              addFiles(e.target.files)
              e.target.value = ''
            }}
          />
        </div>
        {errors.files && <p className="text-xs text-red-600">{errors.files.message}</p>}

        {files.length > 0 && (
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
            {files.map((f, i) => (
              <li key={`${f.name}-${i}`} className="flex items-center gap-3 px-3 py-2 text-sm">
                <span className="min-w-0 flex-1 truncate">{f.name}</span>
                <span className="text-xs text-slate-500">{formatBytes(f.size)}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Remover ${f.name}`}
                  onClick={() => setValue('files', files.filter((_, j) => j !== i), { shouldValidate: true })}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}

        <FormField label="Comentário" htmlFor="comment" error={errors.comment?.message}>
          <Textarea id="comment" rows={2} className="min-h-10" {...register('comment')} />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Competência" htmlFor="competence" hint="Mês de referência (ex.: guias e folha).">
            <Input id="competence" type="month" {...register('competence')} />
          </FormField>
          <FormField label="Data de vencimento" htmlFor="dueDate" hint="Aparece no calendário do cliente.">
            <Input id="dueDate" type="date" {...register('dueDate')} />
          </FormField>
        </div>
      </form>
    </Modal>
  )
}
