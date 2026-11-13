import { forwardRef, type SelectHTMLAttributes } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Select } from '@/components/ui'
import { employeeKeys, employeesApi } from '../api'
import { formatCpf } from '../meta'

interface Props extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  companyId: string
  invalid?: boolean
}

/**
 * Lista suspensa com os empregados ativos e afastados da empresa (desligados não aparecem).
 * O valor é o id do empregado; o nome é gravado pela API a partir do cadastro.
 */
export const EmployeeSelect = forwardRef<HTMLSelectElement, Props>(({ companyId, invalid, ...props }, ref) => {
  const filters = { activeOnly: true }
  const { data = [], isLoading } = useQuery({
    queryKey: employeeKeys.list(companyId, filters),
    queryFn: () => employeesApi.list(companyId, filters),
    enabled: !!companyId,
    staleTime: 60_000,
  })
  const options = data.map((e) => ({
    value: e.id,
    label: [e.name, e.registration && `mat. ${e.registration}`, e.cpf && formatCpf(e.cpf), e.status === 'Afastado' && 'afastado']
      .filter(Boolean)
      .join(' · '),
  }))
  return (
    <Select
      ref={ref}
      options={options}
      placeholder={isLoading ? 'Carregando empregados...' : data.length ? 'Selecione o empregado' : 'Nenhum empregado cadastrado'}
      disabled={isLoading || props.disabled}
      invalid={invalid}
      {...props}
    />
  )
})
EmployeeSelect.displayName = 'EmployeeSelect'
