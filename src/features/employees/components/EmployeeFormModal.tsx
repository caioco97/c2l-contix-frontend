import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import axios from 'axios'
import { z } from 'zod'
import { Button, FormField, Input, Modal, Select } from '@/components/ui'
import { cpfValido } from '@/features/requests/form/schema'
import type { ProblemDetails } from '@/types/api'
import type { Employee, EmployeeInput } from '@/types/domain'
import { employeeErrorField } from '../api'
import { BOND_OPTIONS, STATUS_OPTIONS, formatCpf } from '../meta'

const optional = (max: number) => z.string().max(max, `Máximo de ${max} caracteres.`)
const schema = z
  .object({
    name: z.string().trim().min(1, 'Informe o nome.').max(150, 'Máximo de 150 caracteres.'),
    cpf: z.string().refine((v) => !v.trim() || cpfValido(v), 'CPF inválido.'),
    registration: optional(30),
    role: optional(100),
    bond: z.enum(['Empregado', 'Contribuinte', 'Estagiario']),
    status: z.enum(['Ativo', 'Afastado', 'Desligado']),
    admissionDate: z.string(),
    terminationDate: z.string(),
    email: z.union([z.literal(''), z.email('E-mail inválido.').max(200)]),
    phone: optional(30),
  })
  .refine((v) => v.status !== 'Desligado' || !!v.terminationDate, {
    path: ['terminationDate'],
    message: 'Informe a data do desligamento.',
  })
  .refine((v) => !v.admissionDate || !v.terminationDate || v.status !== 'Desligado' || v.terminationDate >= v.admissionDate, {
    path: ['terminationDate'],
    message: 'Deve ser igual ou posterior à admissão.',
  })

function defaults(e?: Employee | null): EmployeeInput {
  return {
    name: e?.name ?? '',
    cpf: formatCpf(e?.cpf),
    registration: e?.registration ?? '',
    role: e?.role ?? '',
    bond: e?.bond ?? 'Empregado',
    status: e?.status ?? 'Ativo',
    admissionDate: e?.admissionDate ?? '',
    terminationDate: e?.terminationDate ?? '',
    email: e?.email ?? '',
    phone: e?.phone ?? '',
  }
}

interface Props {
  open: boolean
  /** Empregado em edição; sem ele, cadastra um novo. */
  employee?: Employee | null
  onClose: () => void
  /** Rejeita com o erro da API para os campos receberem as mensagens de validação. */
  onSubmit: (input: EmployeeInput) => Promise<unknown>
}

export function EmployeeFormModal({ open, employee, onClose, onSubmit }: Props) {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm<EmployeeInput>({ resolver: zodResolver(schema), defaultValues: defaults(employee) })
  const status = useWatch({ control, name: 'status' })

  useEffect(() => {
    if (open) reset(defaults(employee))
  }, [open, employee, reset])

  const submit = handleSubmit(async (v) => {
    try {
      await onSubmit(v)
    } catch (e) {
      const fieldErrors = axios.isAxiosError<ProblemDetails>(e) ? e.response?.data?.errors : undefined
      for (const [key, messages] of Object.entries(fieldErrors ?? {}))
        if (employeeErrorField[key]) setError(employeeErrorField[key], { message: messages[0] })
    }
  })

  const field = (
    name: keyof EmployeeInput,
    label: string,
    props: { required?: boolean; className?: string; type?: string; placeholder?: string; inputMode?: 'numeric' } = {},
  ) => (
    <div className={props.className}>
      <FormField label={label} htmlFor={`employee-${name}`} error={errors[name]?.message} required={props.required}>
        <Input
          id={`employee-${name}`}
          type={props.type}
          placeholder={props.placeholder}
          inputMode={props.inputMode}
          invalid={!!errors[name]}
          {...register(name)}
        />
      </FormField>
    </div>
  )

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={employee ? 'Editar empregado' : 'Novo empregado'}
      description={employee ? employee.name : 'O cliente passa a encontrá-lo nos formulários de férias, rescisão, afastamento e rubricas.'}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={submit} loading={isSubmitting}>
            {employee ? 'Salvar' : 'Cadastrar empregado'}
          </Button>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-6">
        {field('name', 'Nome completo', { required: true, className: 'sm:col-span-4' })}
        {field('registration', 'Matrícula', { className: 'sm:col-span-2' })}
        {field('cpf', 'CPF', { className: 'sm:col-span-2', placeholder: '000.000.000-00', inputMode: 'numeric' })}
        {field('role', 'Cargo / função', { className: 'sm:col-span-4' })}
        <div className="sm:col-span-3">
          <FormField label="Vínculo" htmlFor="employee-bond" required>
            <Select id="employee-bond" options={BOND_OPTIONS} {...register('bond')} />
          </FormField>
        </div>
        <div className="sm:col-span-3">
          <FormField label="Situação" htmlFor="employee-status" required>
            <Select id="employee-status" options={STATUS_OPTIONS} {...register('status')} />
          </FormField>
        </div>
        {field('admissionDate', 'Admissão / início', { className: 'sm:col-span-3', type: 'date' })}
        {status === 'Desligado' &&
          field('terminationDate', 'Data do desligamento', { className: 'sm:col-span-3', type: 'date', required: true })}
        {field('email', 'E-mail', { className: 'sm:col-span-3', type: 'email' })}
        {field('phone', 'Telefone', { className: 'sm:col-span-3', inputMode: 'numeric' })}
        <button type="submit" hidden />
      </form>
    </Modal>
  )
}
