import { useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { FormProvider, useForm, useWatch, type FieldPath, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'
import { ArrowLeft, Send } from 'lucide-react'
import { Button, Card, CardBody, EmptyState, FormField, Input, Select, Skeleton, Textarea, useToast } from '@/components/ui'
import { useActiveCompany } from '@/features/companies/ActiveCompanyContext'
import { getErrorMessage } from '@/lib/api'
import type { ProblemDetails } from '@/types/api'
import type { Department, ServiceRequestType } from '@/types/domain'
import { requestKeys, requestsApi } from '../api'
import { AttachmentPicker } from '../components/AttachmentPicker'
import { RequestFields } from '../form/RequestFields'
import { apiErrorPath, buildSchema, defaultValues, toApiData, type RequestFormValues } from '../form/schema'
import { useRequestTypes } from '../hooks'
import { DEPARTMENTS } from '../meta'

export function NewRequestPage() {
  const { typeCode } = useParams()
  const { data: types, isLoading } = useRequestTypes()
  const type = types?.find((t) => t.code === typeCode)

  if (isLoading) return <Skeleton className="h-96 rounded-xl" />
  if (!type)
    return (
      <EmptyState
        title="Tipo de solicitação não encontrado"
        action={
          <Link to="/portal">
            <Button size="sm">Voltar ao catálogo</Button>
          </Link>
        }
      />
    )
  // key: reinicia o formulário ao trocar de tipo.
  return <RequestForm key={type.code} type={type} />
}

function RequestForm({ type }: { type: ServiceRequestType }) {
  const navigate = useNavigate()
  const toast = useToast()
  const queryClient = useQueryClient()
  const { company } = useActiveCompany()
  const companyId = company?.id ?? ''
  const geral = type.code === 'Geral'

  const resolver = useMemo(() => zodResolver(buildSchema(type)) as unknown as Resolver<RequestFormValues>, [type])
  const form = useForm<RequestFormValues>({ resolver, defaultValues: defaultValues(type) })
  const {
    register,
    handleSubmit,
    setValue,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = form
  const attachments = useWatch({ control, name: 'attachments' })

  const onSubmit = handleSubmit(async () => {
    // O zod remove campos que não valida; a conversão usa os valores brutos do formulário.
    const values = form.getValues()
    try {
      const created = await requestsApi.create(companyId, {
        typeCode: type.code,
        subject: geral ? values.subject.trim() : undefined,
        department: geral ? (values.department as Department) : undefined,
        description: values.description.trim() || undefined,
        data: toApiData(type.code, values.data),
        attachments: values.attachments,
      })
      queryClient.invalidateQueries({ queryKey: requestKeys.all })
      toast.success(`Solicitação #${created.number} enviada ao escritório.`)
      navigate(`/portal/solicitacoes/${created.id}`)
    } catch (e) {
      // Erros de validação da API vão para os campos correspondentes.
      const fieldErrors = axios.isAxiosError<ProblemDetails>(e) ? e.response?.data?.errors : undefined
      if (fieldErrors)
        for (const [key, messages] of Object.entries(fieldErrors))
          setError(apiErrorPath(key) as FieldPath<RequestFormValues>, { message: messages[0] })
      toast.error(getErrorMessage(e, 'Não foi possível enviar a solicitação.'))
    }
  })

  return (
    <div className="space-y-4">
      <Link to="/portal" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline">
        <ArrowLeft className="h-4 w-4" />
        Voltar ao catálogo
      </Link>
      <div>
        <h1 className="text-xl font-semibold text-ink">{type.name}</h1>
        <p className="text-sm text-slate-500">{type.description}</p>
      </div>

      <Card>
        <CardBody>
          <FormProvider {...form}>
            <form onSubmit={onSubmit} noValidate className="space-y-6">
              {geral && (
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
              )}

              <RequestFields code={type.code} />

              <FormField
                label={geral ? 'Descrição' : 'Observações para o escritório'}
                htmlFor="description"
                error={errors.description?.message}
                required={geral}
              >
                <Textarea id="description" rows={geral ? 6 : 3} invalid={!!errors.description} {...register('description')} />
              </FormField>

              <AttachmentPicker
                files={attachments}
                onChange={(files) => setValue('attachments', files, { shouldValidate: form.formState.isSubmitted })}
                error={errors.attachments?.message}
                hint={type.attachmentHint}
                required={type.requiresAttachment}
              />

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
          </FormProvider>
        </CardBody>
      </Card>
    </div>
  )
}
