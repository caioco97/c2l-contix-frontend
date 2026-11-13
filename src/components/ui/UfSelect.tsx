import { forwardRef } from 'react'
import { UF_OPTIONS } from '@/lib/br'
import { Select, type SelectProps } from './Select'

/** Select com as 27 unidades federativas. Guarda a sigla (ex.: "SP"). */
export const UfSelect = forwardRef<HTMLSelectElement, Omit<SelectProps, 'options'>>(({ placeholder = 'Selecione', ...props }, ref) => (
  <Select ref={ref} options={UF_OPTIONS} placeholder={placeholder} {...props} />
))
UfSelect.displayName = 'UfSelect'
