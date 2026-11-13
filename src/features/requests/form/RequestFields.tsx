import { useFieldArray, useFormContext, type FieldPath } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { Plus, Trash2 } from 'lucide-react'
import { Button, Checkbox, FormField, Input, Select } from '@/components/ui'
import { useActiveCompany } from '@/features/companies/ActiveCompanyContext'
import { EmployeeSelect } from '@/features/employees/components/EmployeeSelect'
import type { ServiceRequestTypeCode } from '@/types/domain'
import { optionsOf } from '../meta'
import { emptyRubrica, type RequestFormValues } from './schema'

type Name = FieldPath<RequestFormValues>

function useFieldError(name: Name): string | undefined {
  const { formState } = useFormContext<RequestFormValues>()
  // Percorre o objeto de erros pelo caminho "data.lancamentos.0.valor".
  let node: unknown = formState.errors
  for (const part of name.split('.')) node = (node as Record<string, unknown> | undefined)?.[part]
  return (node as { message?: string } | undefined)?.message
}

function Field({
  name,
  label,
  required,
  hint,
  type = 'text',
  className,
  ...rest
}: {
  name: Name
  label: string
  required?: boolean
  hint?: string
  type?: string
  className?: string
  placeholder?: string
  inputMode?: 'decimal' | 'numeric' | 'text'
  maxLength?: number
  step?: string
  min?: string
  list?: string
}) {
  const { register } = useFormContext<RequestFormValues>()
  const error = useFieldError(name)
  return (
    <div className={className}>
      <FormField label={label} htmlFor={name} error={error} hint={hint} required={required}>
        <Input id={name} type={type} invalid={!!error} {...rest} {...register(name)} />
      </FormField>
    </div>
  )
}

function SelectField({
  name,
  label,
  options,
  required,
}: {
  name: Name
  label: string
  options: { value: string; label: string }[]
  required?: boolean
}) {
  const { register } = useFormContext<RequestFormValues>()
  const error = useFieldError(name)
  return (
    <FormField label={label} htmlFor={name} error={error} required={required}>
      <Select id={name} options={options} placeholder="Selecione" invalid={!!error} {...register(name)} />
    </FormField>
  )
}

/** Empregado escolhido no cadastro da empresa ativa (não é digitado). */
function EmployeeField({ name, className, hint = true }: { name: Name; className?: string; hint?: boolean }) {
  const { register } = useFormContext<RequestFormValues>()
  const { company } = useActiveCompany()
  const error = useFieldError(name)
  return (
    <div className={className}>
      <FormField label="Empregado" htmlFor={name} error={error} required>
        <EmployeeSelect id={name} companyId={company?.id ?? ''} invalid={!!error} {...register(name)} />
      </FormField>
      {hint && !error && (
        <p className="mt-1.5 text-xs text-slate-500">
          Não encontrou? Veja os{' '}
          <Link to="/portal/empregados" className="font-medium text-brand-700 hover:underline">
            empregados cadastrados
          </Link>{' '}
          ou envie uma solicitação de{' '}
          <Link to="/portal/solicitacoes/nova/CadastroEmpregado" className="font-medium text-brand-700 hover:underline">
            cadastro de empregado
          </Link>
          .
        </p>
      )}
    </div>
  )
}

function CheckField({ name, label }: { name: Name; label: string }) {
  const { register } = useFormContext<RequestFormValues>()
  return (
    <label className="flex items-center gap-2 text-sm text-slate-700">
      <Checkbox {...register(name)} />
      {label}
    </label>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-4">
      <legend className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</legend>
      {children}
    </fieldset>
  )
}

const grid = 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3'

function PessoaFields({ code }: { code: ServiceRequestTypeCode }) {
  const contribuinte = code === 'CadastroContribuinte'
  const estagio = code === 'CadastroEstagiario'
  return (
    <div className="space-y-6">
      <Section title="Dados pessoais">
        <div className={grid}>
          <Field name="data.nome" label="Nome completo" required className="sm:col-span-2" />
          <Field name="data.dataNascimento" label="Data de nascimento" type="date" required />
          <Field name="data.cpf" label="CPF" required placeholder="000.000.000-00" inputMode="numeric" maxLength={14} />
          <Field name="data.rg" label="RG" />
          <Field name="data.pis" label="PIS/PASEP/NIT" inputMode="numeric" maxLength={14} />
          <Field name="data.email" label="E-mail" type="email" />
          <Field name="data.telefone" label="Telefone" inputMode="numeric" />
        </div>
      </Section>
      <Section title="Endereço">
        <div className={grid}>
          <Field name="data.endereco.cep" label="CEP" inputMode="numeric" maxLength={9} />
          <Field name="data.endereco.logradouro" label="Logradouro" className="sm:col-span-2" />
          <Field name="data.endereco.numero" label="Número" />
          <Field name="data.endereco.complemento" label="Complemento" />
          <Field name="data.endereco.bairro" label="Bairro" />
          <Field name="data.endereco.cidade" label="Cidade" className="sm:col-span-2" />
          <Field name="data.endereco.uf" label="UF" maxLength={2} />
        </div>
      </Section>
      <Section title={estagio ? 'Estágio' : contribuinte ? 'Contribuição' : 'Contrato de trabalho'}>
        <div className={grid}>
          <Field name="data.cargo" label={contribuinte ? 'Função (sócio, autônomo...)' : 'Cargo'} required />
          <Field
            name="data.salario"
            label={contribuinte ? 'Valor do pró-labore/serviço (R$)' : estagio ? 'Valor da bolsa (R$)' : 'Salário (R$)'}
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            required
          />
          {!contribuinte && <Field name="data.jornada" label="Jornada" placeholder="Ex.: 44h semanais, 8h às 17h" required />}
          <Field name="data.dataAdmissao" label={code === 'CadastroEmpregado' ? 'Data de admissão' : 'Data de início'} type="date" required />
          {estagio && (
            <>
              <Field name="data.dataTerminoEstagio" label="Término previsto" type="date" required />
              <Field name="data.instituicaoEnsino" label="Instituição de ensino" required />
              <Field name="data.curso" label="Curso" required />
            </>
          )}
        </div>
      </Section>
    </div>
  )
}

function FeriasFields() {
  return (
    <Section title="Férias">
      <div className={grid}>
        <EmployeeField name="data.empregadoId" className="sm:col-span-2 lg:col-span-3" />
        <Field name="data.periodoAquisitivoInicio" label="Período aquisitivo (início)" type="date" required />
        <Field name="data.periodoAquisitivoFim" label="Período aquisitivo (fim)" type="date" required />
        <Field name="data.dataInicio" label="Início das férias" type="date" required />
        <Field name="data.dias" label="Dias de gozo" type="number" min="5" step="1" inputMode="numeric" required />
      </div>
      <div className="flex flex-wrap gap-6">
        <CheckField name="data.abonoPecuniario" label="Vender 10 dias (abono pecuniário)" />
        <CheckField name="data.adiantamento13" label="Adiantar a 1ª parcela do 13º" />
      </div>
    </Section>
  )
}

function RescisaoFields() {
  return (
    <Section title="Desligamento">
      <div className={grid}>
        <EmployeeField name="data.empregadoId" className="sm:col-span-2 lg:col-span-3" />
        <SelectField
          name="data.tipoDesligamento"
          label="Tipo de desligamento"
          required
          options={optionsOf('SemJustaCausa', 'ComJustaCausa', 'PedidoDemissao', 'AcordoMutuo', 'TerminoContrato')}
        />
        <Field name="data.dataDesligamento" label="Data do desligamento" type="date" required />
        <SelectField name="data.avisoPrevio" label="Aviso prévio" required options={optionsOf('Trabalhado', 'Indenizado', 'Dispensado')} />
      </div>
    </Section>
  )
}

function AfastamentoFields() {
  return (
    <Section title="Afastamento">
      <div className={grid}>
        <EmployeeField name="data.empregadoId" className="sm:col-span-2 lg:col-span-3" />
        <SelectField
          name="data.motivo"
          label="Motivo"
          required
          options={optionsOf('Doenca', 'AcidenteTrabalho', 'LicencaMaternidade', 'LicencaPaternidade', 'ServicoMilitar', 'Outros')}
        />
        <Field name="data.dataInicio" label="Início" type="date" required />
        <Field name="data.previsaoRetorno" label="Previsão de retorno" type="date" />
      </div>
    </Section>
  )
}

const RUBRICAS = ['Horas extras 50%', 'Horas extras 100%', 'Adicional noturno', 'Faltas', 'Atrasos', 'Comissões', 'Gratificação', 'Vale-transporte (desconto)']

function RubricasFields() {
  const { control } = useFormContext<RequestFormValues>()
  const { fields, append, remove } = useFieldArray({ control, name: 'data.lancamentos' })
  const listError = useFieldError('data.lancamentos')
  return (
    <Section title="Lançamentos da folha">
      <p className="text-xs text-slate-500">
        Escolha cada empregado no cadastro da empresa. Não encontrou alguém? Veja os{' '}
        <Link to="/portal/empregados" className="font-medium text-brand-700 hover:underline">
          empregados cadastrados
        </Link>
        .
      </p>
      <div className="max-w-xs">
        <Field name="data.competencia" label="Competência" type="month" required />
      </div>
      <datalist id="rubricas-sugeridas">
        {RUBRICAS.map((r) => (
          <option key={r} value={r} />
        ))}
      </datalist>
      <div className="space-y-3">
        {fields.map((f, i) => (
          <div key={f.id} className="grid items-start gap-3 rounded-lg border border-slate-200 p-3 sm:grid-cols-[1.4fr_1.2fr_0.7fr_0.8fr_auto]">
            <EmployeeField name={`data.lancamentos.${i}.empregadoId`} hint={false} />
            <Field name={`data.lancamentos.${i}.rubrica`} label="Rubrica" required list="rubricas-sugeridas" />
            <Field name={`data.lancamentos.${i}.quantidade`} label="Qtd./horas" type="number" step="0.01" min="0" inputMode="decimal" />
            <Field name={`data.lancamentos.${i}.valor`} label="Valor (R$)" type="number" step="0.01" min="0" inputMode="decimal" />
            <Button
              variant="ghost"
              size="icon"
              className="sm:mt-7"
              aria-label={`Remover lançamento ${i + 1}`}
              disabled={fields.length === 1}
              onClick={() => remove(i)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        {listError && <p className="text-xs text-red-600">{listError}</p>}
        <Button variant="secondary" size="sm" onClick={() => append(emptyRubrica())}>
          <Plus className="h-4 w-4" />
          Adicionar lançamento
        </Button>
      </div>
    </Section>
  )
}

/** Campos específicos de cada tipo de solicitação. */
export function RequestFields({ code }: { code: ServiceRequestTypeCode }) {
  switch (code) {
    case 'CadastroEmpregado':
    case 'CadastroContribuinte':
    case 'CadastroEstagiario':
      return <PessoaFields code={code} />
    case 'AvisoFerias':
    case 'CalculoFerias':
      return <FeriasFields />
    case 'AvisoRescisao':
    case 'CalculoRescisao':
      return <RescisaoFields />
    case 'Afastamento':
      return <AfastamentoFields />
    case 'LancamentoRubricas':
      return <RubricasFields />
    default:
      return null
  }
}
