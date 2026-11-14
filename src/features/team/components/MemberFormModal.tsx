import { useState } from 'react'
import { Button, Checkbox, FormField, Input, Modal, Select } from '@/components/ui'
import type { Department } from '@/types/domain'
import type { OfficeDepartment, TeamMember, TeamMemberInput, TeamRole } from '../api'

interface Props {
  open: boolean
  member: TeamMember | null
  departments: OfficeDepartment[]
  saving: boolean
  onClose: () => void
  onSubmit: (input: TeamMemberInput) => void
}

const ROLES: { value: TeamRole; label: string }[] = [
  { value: 'Collaborator', label: 'Colaborador' },
  { value: 'Admin', label: 'Administrador' },
]

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Convite de novo integrante da equipe ou edição de nome, perfil e departamentos. */
export function MemberFormModal({ open, member, departments, saving, onClose, onSubmit }: Props) {
  // Montado a cada abertura (key no pai): o estado inicial vem das props.
  const [name, setName] = useState(member?.name ?? '')
  const [email, setEmail] = useState(member?.email ?? '')
  const [role, setRole] = useState<TeamRole>(member?.role ?? 'Collaborator')
  const [depts, setDepts] = useState<Department[]>(member?.departments ?? [])
  const [touched, setTouched] = useState(false)

  const errors = {
    name: !name.trim() ? 'Informe o nome.' : undefined,
    email: !member && !EMAIL.test(email.trim()) ? 'Informe um e-mail válido.' : undefined,
  }
  const valid = !errors.name && !errors.email

  const toggle = (d: Department) => setDepts((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]))

  const submit = () => {
    setTouched(true)
    if (valid) onSubmit({ name, email, role, departments: depts })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={member ? 'Editar integrante' : 'Convidar para a equipe'}
      description={member ? member.email : 'A pessoa recebe um e-mail para criar a senha e entrar no Contix.'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={submit} loading={saving}>
            {member ? 'Salvar' : 'Enviar convite'}
          </Button>
        </>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <FormField label="Nome" htmlFor="member-name" required error={touched ? errors.name : undefined}>
          <Input
            id="member-name"
            value={name}
            maxLength={150}
            onChange={(e) => setName(e.target.value)}
            invalid={touched && !!errors.name}
          />
        </FormField>
        {!member && (
          <FormField label="E-mail" htmlFor="member-email" required error={touched ? errors.email : undefined}>
            <Input
              id="member-email"
              type="email"
              value={email}
              maxLength={200}
              onChange={(e) => setEmail(e.target.value)}
              invalid={touched && !!errors.email}
            />
          </FormField>
        )}
        <FormField
          label="Perfil"
          htmlFor="member-role"
          hint="Administradores também gerenciam a equipe, os departamentos e as obrigações recorrentes."
        >
          <Select id="member-role" value={role} onChange={(e) => setRole(e.target.value as TeamRole)} options={ROLES} />
        </FormField>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-slate-700">Departamentos em que atua</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {departments.map((d) => (
              <label key={d.code} className="flex items-center gap-2 text-sm text-slate-700">
                <Checkbox checked={depts.includes(d.code)} onChange={() => toggle(d.code)} />
                {d.name}
                {!d.active && <span className="text-xs text-slate-400">(inativo)</span>}
              </label>
            ))}
          </div>
        </fieldset>
      </form>
    </Modal>
  )
}
