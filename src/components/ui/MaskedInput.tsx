import { forwardRef, type ChangeEvent } from 'react'
import { formatCep, formatCnpj, formatCpf, formatCpfCnpj, formatIe, formatIm, formatPhone, formatPis } from '@/lib/br'
import { Input, type InputProps } from './Input'

export type MaskKind = 'cpf' | 'cnpj' | 'cpfCnpj' | 'phone' | 'pis' | 'cep' | 'ie' | 'im'

interface MaskDef {
  format: (v: string) => string
  placeholder: string
  inputMode: 'numeric' | 'tel' | 'text'
  /** Texto fixo no início, cujos dígitos não contam para o cursor. */
  prefix?: string
}

const MASKS: Record<MaskKind, MaskDef> = {
  cpf: { format: formatCpf, placeholder: '000.000.000-00', inputMode: 'numeric' },
  cnpj: { format: formatCnpj, placeholder: '00.000.000/0000-00', inputMode: 'numeric' },
  cpfCnpj: { format: formatCpfCnpj, placeholder: 'CNPJ ou CPF', inputMode: 'numeric' },
  phone: { format: formatPhone, placeholder: '+55 (00) 00000-0000', inputMode: 'tel', prefix: '+55' },
  pis: { format: formatPis, placeholder: '000.00000.00-0', inputMode: 'numeric' },
  cep: { format: formatCep, placeholder: '00000-000', inputMode: 'numeric' },
  ie: { format: formatIe, placeholder: 'Somente números ou ISENTO', inputMode: 'text' },
  im: { format: formatIm, placeholder: 'Somente números', inputMode: 'numeric' },
}

const countDigits = (s: string) => s.replace(/\D/g, '').length

/** Posição no texto formatado logo após o n-ésimo dígito (ignorando o prefixo). */
function caretAfter(formatted: string, n: number, prefix = '') {
  const start = formatted.startsWith(prefix) ? prefix.length : 0
  if (n === 0) return Math.min(start, formatted.length)
  let seen = 0
  for (let i = start; i < formatted.length; i++) {
    if (/\d/.test(formatted[i]) && ++seen === n) return i + 1
  }
  return formatted.length
}

export interface MaskedInputProps extends Omit<InputProps, 'inputMode'> {
  mask: MaskKind
}

/**
 * Input com máscara que funciona com `register` do react-hook-form: formata o valor
 * no próprio evento e preserva a posição do cursor ao editar no meio do texto.
 */
export const MaskedInput = forwardRef<HTMLInputElement, MaskedInputProps>(({ mask, onChange, placeholder, ...props }, ref) => {
  const def = MASKS[mask]

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const el = e.target
    const raw = el.value
    const caret = el.selectionStart ?? raw.length
    const formatted = def.format(raw)
    if (formatted !== raw) {
      const atEnd = caret >= raw.length
      let before = raw.slice(0, caret)
      if (def.prefix && before.startsWith(def.prefix)) before = before.slice(def.prefix.length)
      el.value = formatted
      if (document.activeElement === el && /\d/.test(formatted)) {
        const pos = atEnd ? formatted.length : caretAfter(formatted, countDigits(before), def.prefix)
        el.setSelectionRange(pos, pos)
      }
    }
    onChange?.(e)
  }

  return (
    <Input
      ref={ref}
      inputMode={def.inputMode}
      autoComplete="off"
      placeholder={placeholder ?? def.placeholder}
      onChange={handleChange}
      {...props}
    />
  )
})
MaskedInput.displayName = 'MaskedInput'
