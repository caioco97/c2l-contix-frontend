import { digits, formatCpf as formatCpfMask } from '@/lib/br'
import type { EmployeeBond, EmployeeStatus } from '@/types/domain'

export const bondLabels: Record<EmployeeBond, string> = {
  Empregado: 'Empregado',
  Contribuinte: 'Contribuinte (sócio/autônomo)',
  Estagiario: 'Estagiário',
}

export const statusLabels: Record<EmployeeStatus, { label: string; tone: 'success' | 'warning' | 'neutral' }> = {
  Ativo: { label: 'Ativo', tone: 'success' },
  Afastado: { label: 'Afastado', tone: 'warning' },
  Desligado: { label: 'Desligado', tone: 'neutral' },
}

export const BOND_OPTIONS = (Object.keys(bondLabels) as EmployeeBond[]).map((v) => ({ value: v, label: bondLabels[v] }))
export const STATUS_OPTIONS = (Object.keys(statusLabels) as EmployeeStatus[]).map((v) => ({ value: v, label: statusLabels[v].label }))

/** CPF com máscara quando completo; senão, como veio. */
export function formatCpf(cpf: string | null | undefined) {
  if (!cpf) return ''
  return digits(cpf).length === 11 ? formatCpfMask(cpf) : cpf
}
