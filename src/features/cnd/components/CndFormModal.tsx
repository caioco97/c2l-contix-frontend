import { useEffect, useRef } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { addDays, format } from 'date-fns'
import { FileText, Paperclip, X } from 'lucide-react'
import { Button, Checkbox, FormField, Input, Modal, Select, Textarea } from '@/components/ui'
import { CND_SITUATIONS, CND_TYPES } from '@/features/cnd/api'
import { formatBytes } from '@/lib/format'
import type { Cnd, CndInput, CndType } from '@/types/domain'

const MAX_SIZE = 25 * 1024 * 1024

const schema = z
  .object({
    type: z.enum(['FederalPgfn', 'Estadual', 'Municipal', 'Fgts', 'Trabalhista']),
    situation: z.enum(['Negativa', 'PositivaComEfeitoNegativa', 'Positiva']),
    number: z.string().max(100, 'Máximo de 100 caracteres.'),
    issuedAt: z.string().min(1, 'Informe a data de emissão.'),
    validUntil: z.string().min(1, 'Informe a validade.'),
    notes: z.string().max(1000, 'Máximo de 1000 caracteres.'),
    file: z
      .instanceof(File)
      .nullable()
      .refine((f) => !f || f.size <= MAX_SIZE, 'O arquivo pode ter no máximo 25 MB.'),
    removeFile: z.boolean(),
  })
  .refine((v) => !v.issuedAt || !v.validUntil || v.validUntil >= v.issuedAt, {
    path: ['validUntil'],
    message: 'A validade não pode ser anterior à emissão.',
  })
type FormValues = z.infer<typeof schema>

/** Validade padrão por tipo (dias), para agilizar o cadastro. */
const DEFAULT_VALIDITY: Record<CndType, number> = { FederalPgfn: 180, Estadual: 90, Municipal: 90, Fgts: 30, Trabalhista: 180 }
const ymd = (d: Date) => format(d, 'yyyy-MM-dd')

interface Props {
  open: boolean
  /** Certidão sendo editada; sem ela, cadastra uma nova (opcionalmente já com o tipo). */
  cnd?: Cnd | null
  initialType?: CndType
  companyName?: string
  onClose: () => void
  onSubmit: (input: CndInput) => Promise<void>
}

function defaults(cnd?: Cnd | null, type: CndType = 'FederalPgfn'): FormValues {
  if (cnd)
    return {
      type: cnd.type,
      situation: cnd.situation,
      number: cnd.number ?? '',
      issuedAt: cnd.issuedAt,
      validUntil: cnd.validUntil,
      notes: cnd.notes ?? '',
      file: null,
      removeFile: false,
    }
  const today = new Date()
  return {
    type,
    situation: 'Negativa',
    number: '',
    issuedAt: ymd(today),
    validUntil: ymd(addDays(today, DEFAULT_VALIDITY[type])),
    notes: '',
    file: null,
    removeFile: false,
  }
}

export function CndFormModal({ open, cnd, initialType, companyName, onClose, onSubmit }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    getFieldState,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: defaults(cnd, initialType) })
  const [file, removeFile] = useWatch({ control, name: ['file', 'removeFile'] })

  useEffect(() => {
    if (open) reset(defaults(cnd, initialType))
  }, [open, cnd, initialType, reset])

  const submit = handleSubmit(async (v) => {
    await onSubmit({
      type: v.type,
      situation: v.situation,
      number: v.number.trim() || undefined,
      issuedAt: v.issuedAt,
      validUntil: v.validUntil,
      notes: v.notes.trim() || undefined,
      file: v.file,
      removeFile: v.removeFile,
    })
  })

  // Ao trocar o tipo numa certidão nova, sugere a validade usual (se o usuário não mexeu nela).
  const onTypeChange = (type: CndType, issuedAt: string) => {
    if (cnd || getFieldState('validUntil').isDirty || !issuedAt) return
    setValue('validUntil', ymd(addDays(new Date(`${issuedAt}T00:00:00`), DEFAULT_VALIDITY[type])))
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={cnd ? 'Editar certidão' : 'Nova certidão'}
      description={companyName}
      size="lg"
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
      <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
        <FormField label="Tipo" htmlFor="cnd-type" required>
          <Controller
            control={control}
            name="type"
            render={({ field }) => (
              <Select
                id="cnd-type"
                options={CND_TYPES}
                value={field.value}
                onChange={(e) => {
                  field.onChange(e.target.value)
                  onTypeChange(e.target.value as CndType, getValues('issuedAt'))
                }}
              />
            )}
          />
        </FormField>
        <FormField label="Situação" htmlFor="cnd-situation" required>
          <Select id="cnd-situation" options={[...CND_SITUATIONS]} {...register('situation')} />
        </FormField>
        <FormField label="Emissão" htmlFor="cnd-issued" error={errors.issuedAt?.message} required>
          <Input id="cnd-issued" type="date" invalid={!!errors.issuedAt} {...register('issuedAt')} />
        </FormField>
        <FormField label="Validade" htmlFor="cnd-valid" error={errors.validUntil?.message} required>
          <Input id="cnd-valid" type="date" invalid={!!errors.validUntil} {...register('validUntil')} />
        </FormField>
        <div className="sm:col-span-2">
          <FormField label="Número / código de controle" htmlFor="cnd-number" error={errors.number?.message}>
            <Input id="cnd-number" {...register('number')} />
          </FormField>
        </div>
        <div className="sm:col-span-2">
          <FormField label="Observação" htmlFor="cnd-notes" error={errors.notes?.message}>
            <Textarea id="cnd-notes" rows={2} {...register('notes')} />
          </FormField>
        </div>

        <div className="space-y-2 sm:col-span-2">
          <span className="block text-sm font-medium text-slate-700">Arquivo da certidão</span>
          {cnd?.hasFile && !file && !removeFile && (
            <div className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <FileText className="h-4 w-4 text-slate-400" />
              <span className="min-w-0 flex-1 truncate">{cnd.fileName}</span>
              {cnd.sizeBytes != null && <span className="text-xs text-slate-500">{formatBytes(cnd.sizeBytes)}</span>}
            </div>
          )}
          {file ? (
            <div className="flex items-center gap-3 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm">
              <FileText className="h-4 w-4 text-brand-600" />
              <span className="min-w-0 flex-1 truncate">{file.name}</span>
              <span className="text-xs text-slate-500">{formatBytes(file.size)}</span>
              <Button variant="ghost" size="icon" aria-label="Remover arquivo" onClick={() => setValue('file', null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
              <Paperclip className="h-4 w-4" />
              {cnd?.hasFile ? 'Substituir arquivo' : 'Anexar arquivo'}
            </Button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            className="sr-only"
            onChange={(e) => {
              setValue('file', e.target.files?.[0] ?? null, { shouldValidate: true })
              e.target.value = ''
            }}
          />
          {errors.file && <p className="text-xs text-red-600">{errors.file.message}</p>}
          {cnd?.hasFile && !file && (
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <Checkbox {...register('removeFile')} /> Remover o arquivo atual
            </label>
          )}
        </div>
      </form>
    </Modal>
  )
}
