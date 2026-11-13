import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button, FormField, Input, MaskedInput, Modal, Select, UfSelect, type MaskKind } from '@/components/ui'
import { digits, formatCep, formatCpfCnpj, formatIe, formatIm, formatPhone, phoneDigits } from '@/lib/br'
import { useCepLookup } from '@/lib/cep'
import { br } from '@/lib/zodBr'
import type { CompanyDetail, CompanyInput } from '@/types/domain'
import { COMPANY_STATUSES, TAX_REGIMES } from '../meta'

const optional = (max: number) => z.string().max(max, `Máximo de ${max} caracteres.`)

const schema = z.object({
  legalName: z.string().trim().min(1, 'Informe a razão social.').max(200, 'Máximo de 200 caracteres.'),
  tradeName: optional(200),
  nickname: optional(60),
  document: br.cpfOuCnpj(),
  stateRegistration: br.ie(),
  cityRegistration: br.im(),
  taxRegime: z.enum(['SimplesNacional', 'LucroPresumido', 'LucroReal', 'MEI', 'Imune', 'Isento', 'Outro']),
  status: z.enum(['Ativa', 'Inativa', 'Suspensa', 'Baixada']),
  email: z.union([z.literal(''), z.email('E-mail inválido.').max(200)]),
  phone: br.telefone(),
  zip: br.cep(),
  street: optional(200),
  number: optional(20),
  complement: optional(100),
  district: optional(100),
  city: optional(100),
  state: br.uf(),
})
type FormValues = z.infer<typeof schema>

function defaults(c?: CompanyDetail | null): FormValues {
  const a = c?.address
  return {
    legalName: c?.legalName ?? '',
    tradeName: c?.tradeName ?? '',
    nickname: c?.nickname ?? '',
    document: c ? formatCpfCnpj(c.document) : '',
    stateRegistration: formatIe(c?.stateRegistration),
    cityRegistration: formatIm(c?.cityRegistration),
    taxRegime: c?.taxRegime ?? 'SimplesNacional',
    status: c?.status ?? 'Ativa',
    email: c?.email ?? '',
    phone: formatPhone(c?.phone),
    zip: formatCep(a?.zip ?? ''),
    street: a?.street ?? '',
    number: a?.number ?? '',
    complement: a?.complement ?? '',
    district: a?.district ?? '',
    city: a?.city ?? '',
    state: (a?.state ?? '').toUpperCase(),
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
    setValue,
    setFocus,
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
      stateRegistration: formatIe(v.stateRegistration) || null,
      cityRegistration: digits(v.cityRegistration) || null,
      taxRegime: v.taxRegime,
      status: v.status,
      email: v.email || null,
      phone: phoneDigits(v.phone) || null,
      address: {
        zip: digits(v.zip),
        street: v.street,
        number: v.number,
        complement: v.complement,
        district: v.district,
        city: v.city,
        state: v.state,
      },
    })
  })

  const cep = useCepLookup((a) => {
    const opts = { shouldDirty: true, shouldValidate: true }
    setValue('street', a.street, opts)
    setValue('district', a.district, opts)
    setValue('city', a.city, opts)
    setValue('state', a.state.toUpperCase(), opts)
    setFocus(a.street ? 'number' : 'street')
  })

  type FieldProps = { required?: boolean; className?: string; placeholder?: string; mask?: MaskKind; hint?: string }
  const field = (name: keyof FormValues, label: string, props: FieldProps = {}) => {
    const reg = name === 'zip' ? register(name, { onChange: (e) => cep.lookup(e.target.value) }) : register(name)
    const common = { id: `company-${name}`, placeholder: props.placeholder, invalid: !!errors[name], ...reg }
    return (
      <div className={props.className}>
        <FormField label={label} htmlFor={`company-${name}`} error={errors[name]?.message} required={props.required} hint={props.hint}>
          {props.mask ? <MaskedInput mask={props.mask} {...common} /> : <Input {...common} />}
        </FormField>
      </div>
    )
  }

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
        {field('document', 'CNPJ ou CPF', { required: true, className: 'sm:col-span-2', mask: 'cpfCnpj' })}
        {field('stateRegistration', 'Inscrição estadual', { className: 'sm:col-span-2', mask: 'ie' })}
        {field('cityRegistration', 'Inscrição municipal', { className: 'sm:col-span-2', mask: 'im' })}
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
        {field('phone', 'Telefone / celular', { className: 'sm:col-span-2', mask: 'phone' })}

        <p className="pt-2 text-sm font-semibold text-slate-700 sm:col-span-6">Endereço</p>
        {field('zip', 'CEP', { className: 'sm:col-span-2', mask: 'cep', hint: cep.hint })}
        {field('street', 'Logradouro', { className: 'sm:col-span-4' })}
        {field('number', 'Número', { className: 'sm:col-span-1' })}
        {field('complement', 'Complemento', { className: 'sm:col-span-2' })}
        {field('district', 'Bairro', { className: 'sm:col-span-3' })}
        {field('city', 'Cidade', { className: 'sm:col-span-4' })}
        <div className="sm:col-span-2">
          <FormField label="UF" htmlFor="company-state" error={errors.state?.message}>
            <UfSelect id="company-state" invalid={!!errors.state} {...register('state')} />
          </FormField>
        </div>
        <button type="submit" hidden />
      </form>
    </Modal>
  )
}
