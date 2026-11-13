import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button, FormField, Input, MaskedInput, Modal, Select, UfSelect, type MaskKind } from '@/components/ui'
import { Search } from 'lucide-react'
import { digits, formatCep, formatCpfCnpj, formatIe, formatIm, formatPhone, isValidCnpj, phoneDigits } from '@/lib/br'
import { getErrorMessage } from '@/lib/api'
import { nfeApi } from '@/features/nfe/api'
import type { CnpjData } from '@/features/nfe/types'
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
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: defaults(company) })

  // Preenchimento pelo CNPJ (dados públicos da Receita Federal).
  const [cnpjHint, setCnpjHint] = useState<string>()
  const [lookingUp, setLookingUp] = useState(false)
  const [lastLookup, setLastLookup] = useState('')

  useEffect(() => {
    if (open) reset(defaults(company))
  }, [open, company, reset])
  const fillFromCnpj = (d: CnpjData) => {
    const opts = { shouldDirty: true, shouldValidate: true }
    setValue('legalName', d.legalName, opts)
    if (d.tradeName) setValue('tradeName', d.tradeName, opts)
    if (d.email) setValue('email', d.email, opts)
    if (d.phone) setValue('phone', formatPhone(d.phone), opts)
    if (d.suggestedRegime) setValue('taxRegime', d.suggestedRegime, opts)
    if (d.address) {
      setValue('zip', formatCep(d.address.zip), opts)
      setValue('street', d.address.street, opts)
      setValue('number', d.address.number, opts)
      setValue('complement', d.address.complement, opts)
      setValue('district', d.address.district, opts)
      setValue('city', d.address.city, opts)
      setValue('state', d.address.state.toUpperCase(), opts)
    }
  }
  const lookupCnpj = async (value: string, force = false) => {
    const cnpj = digits(value)
    if (cnpj.length !== 14 || !isValidCnpj(cnpj) || (!force && cnpj === lastLookup)) return
    setLastLookup(cnpj)
    setLookingUp(true)
    setCnpjHint('Consultando o CNPJ na Receita Federal…')
    try {
      const d = await nfeApi.lookupCnpj(cnpj)
      fillFromCnpj(d)
      setCnpjHint(
        d.active
          ? `Dados preenchidos pela Receita Federal (${d.source}). Confira antes de salvar.`
          : `Atenção: situação cadastral ${d.registrationStatus ?? 'não ativa'} na Receita Federal.`,
      )
    } catch (e) {
      setCnpjHint(getErrorMessage(e, 'Não foi possível consultar o CNPJ. Preencha os dados manualmente.'))
    } finally {
      setLookingUp(false)
    }
  }

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
      onClose={() => {
        setCnpjHint(undefined)
        setLastLookup('')
        onClose()
      }}
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
        <div className="sm:col-span-2">
          <FormField label="CNPJ ou CPF" htmlFor="company-document" error={errors.document?.message} required hint={cnpjHint}>
            <div className="flex gap-1">
              <div className="min-w-0 flex-1">
                <MaskedInput
                  mask="cpfCnpj"
                  id="company-document"
                  invalid={!!errors.document}
                  {...register('document', { onChange: (e) => !company && lookupCnpj(e.target.value) })}
                />
              </div>
              <Button
                variant="secondary"
                size="icon"
                className="h-10 w-10 shrink-0"
                title="Preencher com os dados do CNPJ"
                aria-label="Preencher com os dados do CNPJ"
                loading={lookingUp}
                onClick={() => lookupCnpj(getValues('document'), true)}
              >
                {!lookingUp && <Search className="h-4 w-4" />}
              </Button>
            </div>
          </FormField>
        </div>
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
