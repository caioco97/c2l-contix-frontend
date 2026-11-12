import { useQuery } from '@tanstack/react-query'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Info, Paperclip, Send, X } from 'lucide-react'
import { Button, Card, CardBody, FormField, Input, Select, Skeleton, Textarea, useToast } from '@/components/ui'
import { useActiveCompany } from '@/features/companies/ActiveCompanyContext'
import { getErrorMessage } from '@/lib/api'
import { formatBytes } from '@/lib/format'
import { requestKeys, requestsApi } from '../api'
import { DEPARTMENTS } from '../meta'

const schema = z.object({
  subject: z.string().trim().min(5, 'Descreva o assunto em pelo menos 5 caracteres.').max(120),
  department: z.string().min(1, 'Escolha o departamento.'),
  description: z.string().trim().min(10, 'Explique o pedido em pelo menos 10 caracteres.').max(4000),
  attachments: z.array(z.instanceof(File)).max(10, 'Máximo de 10 anexos.'),
})
type Form = z.infer<typeof schema>

const DEFAULT_DEPARTMENT: Record<string, string> = { general: '' }

export function NewRequestPage() {
  const { typeCode = 'general' } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { company } = useActiveCompany()
  const companyId = company?.id ?? ''

  const { data: types, isLoading } = useQuery({
    queryKey: requestKeys.types(companyId),
    queryFn: () => requestsApi.types(companyId),
    enabled: !!companyId,
  })
  const type = types?.find((t) => t.code === typeCode)

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: {
      subject: '',
      department: DEFAULT_DEPARTMENT[typeCode] ?? 'Pessoal',
      description: '',
      attachments: [],
    },
  })
  const attachments = useWatch({ control, name: 'attachments' })

  const onSubmit = handleSubmit(async (values) => {
    try {
      const created = await requestsApi.create(companyId, { typeCode, ...values })
      toast.success(`Solicitação #${created.number} enviada ao escritório.`)
      navigate('/portal/solicitacoes')
    } catch (e) {
      toast.error(getErrorMessage(e, 'Não foi possível enviar a solicitação.'))
    }
  })

  if (isLoading) return <Skeleton className="h-96 rounded-xl" />

  return (
    <div className="space-y-4">
      <Link to="/portal" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline">
        <ArrowLeft className="h-4 w-4" />
        Voltar ao catálogo
      </Link>
      <div>
        <h1 className="text-xl font-semibold text-ink">{type?.name ?? 'Nova solicitação'}</h1>
        {type && <p className="text-sm text-slate-500">{type.description}</p>}
      </div>

      {typeCode !== 'general' && (
        <div className="flex items-start gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          O formulário específico deste tipo (campos de empregado, períodos etc.) chega nas próximas entregas. Por enquanto,
          descreva o pedido e anexe os documentos.
        </div>
      )}

      <Card>
        <CardBody>
          <form onSubmit={onSubmit} noValidate className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-[1fr_220px]">
              <FormField label="Assunto" htmlFor="subject" error={errors.subject?.message} required>
                <Input id="subject" invalid={!!errors.subject} {...register('subject')} />
              </FormField>
              <FormField label="Departamento" htmlFor="department" error={errors.department?.message} required>
                <Select
                  id="department"
                  options={DEPARTMENTS}
                  placeholder="Selecione"
                  invalid={!!errors.department}
                  {...register('department')}
                />
              </FormField>
            </div>

            <FormField label="Descrição" htmlFor="description" error={errors.description?.message} required>
              <Textarea id="description" rows={6} invalid={!!errors.description} {...register('description')} />
            </FormField>

            <div className="space-y-2">
              <span className="block text-sm font-medium text-slate-700">Anexos</span>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-600 hover:border-brand-400 hover:text-brand-700">
                <Paperclip className="h-4 w-4" />
                Adicionar arquivos
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    setValue('attachments', [...attachments, ...Array.from(e.target.files ?? [])], { shouldValidate: true })
                    e.target.value = ''
                  }}
                />
              </label>
              {errors.attachments && <p className="text-xs text-red-600">{errors.attachments.message}</p>}
              {attachments.length > 0 && (
                <ul className="flex flex-wrap gap-2">
                  {attachments.map((f, i) => (
                    <li key={`${f.name}-${i}`} className="flex items-center gap-2 rounded-full bg-slate-100 py-1 pl-3 pr-1 text-xs">
                      {f.name} <span className="text-slate-400">{formatBytes(f.size)}</span>
                      <button
                        type="button"
                        aria-label={`Remover ${f.name}`}
                        onClick={() => setValue('attachments', attachments.filter((_, j) => j !== i))}
                        className="rounded-full p-0.5 hover:bg-slate-200"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <Button variant="secondary" onClick={() => navigate('/portal')}>
                Cancelar
              </Button>
              <Button type="submit" loading={isSubmitting}>
                <Send className="h-4 w-4" />
                Enviar solicitação
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  )
}
