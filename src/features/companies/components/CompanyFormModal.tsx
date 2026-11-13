import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button, FormField, Input, Modal, Select } from '@/components/ui'
import { formatCnpj } from '@/lib/format'
import type { CompanyDetail, CompanyInput } from '@/types/domain'
import { digits, isValidCpfOrCnpj } from '../document'
import { COMPANY_STATUSES, TAX_REGIMES } from '../meta'

const optional = (max: number) => z.string().max(max, `Máximo de ${max} caracteres.`)

const schema = z.object({
  legalName: z.string().trim().min(1, 'Informe a razão social.').max(200, 'Máximo de 200 caracteres.'),
  tradeName: optional(200),
  nickname: optional(60),
  document: z.string().refine(isValidCpfOrCnpj, 'CNPJ ou CPF inválido.'),
  stateRegistration: optional(30),
  cityRegistration: optional(30),
  taxRegime: z.enum(['SimplesNacional', 'LucroPresumido', 'LucroReal', 'MEI', 'Imune', 'Isento', 'Outro']),
  status: z.enum(['Ativa', 'Inativa', 'Suspensa', 'Baixada']),
  email: z.union([z.literal(''), z.email('E-mail inválido.').max(200)]),
  phone: optional(30),
  zip: optional(9),
  street: optional(200),
  number: optional(20),
  complement: optional(100),
  district: optional(100),
  city: optional(100),
  state: optional(2),
})
type FormValues = z.infer<typeof schema>

function defaults(c?: CompanyDetail | null): FormValues {
  const a = c?.address
  return {
    legalName: c?.legalName ?? '',
    tradeName: c?.tradeName ?? '',
    nickname: c?.nickname ?? '',
    document: c ? (c.document.length === 14 ? formatCnpj(c.document) : c.document) : '',
    stateRegistration: c?.stateRegistration ?? '',
    cityRegistration: c?.cityRegistration ?? '',
    taxRegime: c?.taxRegime ?? 'SimplesNacional',
    status: c?.status ?? 'Ativa',
    email: c?.email ?? '',
    phone: c?.phone ?? '',
    zip: a?.zip ?? '',
    street: a?.street ?? '',
    number: a?.number ?? '',
    complement: a?.complement ?? '',
    district: a?.district ?? '',
    city: a?.city ?? '',
    state: a?.state ?? '',
  }
}

interface Props {
  open: boolean
  /** Empresa em edição; sem ela, cadastra uma nova. */
  company?: CompanyDetail | null
  onClose: () => void
  onSubmit: (input: CompanyInput) => Promise<void>
}

export function CompanyFormModal({ open, company, onClose, onSubmit }: Props) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: defaults(company) })

  useEffect(() => {
    if (open) reset(defaults(company))
  }, [open, company, reset])

  const submit = handleSubmit(async (v) => {
    await onSubmit({
      legalName: v.legalName,
      tradeName: v.tradeName || null,
      nickname: v.nickname || null,
      document: digits(v.document),
      stateRegistration: v.stateRegistration || null,
      cityRegistration: v.cityRegistration || null,
      taxRegime: v.taxRegime,
      status: v.status,
      email: v.email || null,
      phone: v.phone || null,
      address: {
        zip: v.zip,
        street: v.street,
        number: v.number,
        complement: v.complement,
        district: v.district,
        city: v.city,
        state: v.state,
      },
    })
  })

  const field = (name: keyof FormValues, label: string, props: { required?: boolean; className?: string; placeholder?: string } = {}) => (
    <div className={props.className}>
      <FormField label={label} htmlFor={`company-${name}`} error={errors[name]?.message} required={props.required}>
        <Input id={`company-${name}`} placeholder={props.placeholder} invalid={!!errors[name]} {...register(name)} />
      </FormField>
    </div>
  )

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={company ? 'Editar empresa' : 'Nova empresa'}
      description={company ? company.legalName : 'As pastas padrão de documentos são criadas automaticamente.'}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={submit} loading={isSubmitting}>
            {company ? 'Salvar' : 'Cadastrar empresa'}
          </Button>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-6">
        {field('legalName', 'Razão social', { required: true, className: 'sm:col-span-6' })}
        {field('tradeName', 'Nome fantasia', { className: 'sm:col-span-4' })}
        {field('nickname', 'Apelido', { className: 'sm:col-span-2', placeholder: 'Ex.: BOMGRAO' })}
        {field('document', 'CNPJ ou CPF', { required: true, className: 'sm:col-span-2' })}
        {field('stateRegistration', 'Inscrição estadual', { className: 'sm:col-span-2' })}
        {field('cityRegistration', 'Inscrição municipal', { className: 'sm:col-span-2' })}
        <div className="sm:col-span-3">
          <FormField label="Regime tributário" htmlFor="company-taxRegime" required>
            <Select id="company-taxRegime" options={TAX_REGIMES} {...register('taxRegime')} />
          </FormField>
        </div>
        <div className="sm:col-span-3">
          <FormField label="Situação" htmlFor="company-status" required>
            <Select id="company-status" options={COMPANY_STATUSES} {...register('status')} />
          </FormField>
        </div>
        {field('email', 'E-mail', { className: 'sm:col-span-4' })}
        {field('phone', 'Telefone', { className: 'sm:col-span-2' })}

        <p className="pt-2 text-sm font-semibold text-slate-700 sm:col-span-6">Endereço</p>
        {field('zip', 'CEP', { className: 'sm:col-span-2' })}
        {field('street', 'Logradouro', { className: 'sm:col-span-4' })}
        {field('number', 'Número', { className: 'sm:col-span-1' })}
        {field('complement', 'Complemento', { className: 'sm:col-span-2' })}
        {field('district', 'Bairro', { className: 'sm:col-span-3' })}
        {field('city', 'Cidade', { className: 'sm:col-span-4' })}
        {field('state', 'UF', { className: 'sm:col-span-2' })}
        <button type="submit" hidden />
      </form>
    </Modal>
  )
}
