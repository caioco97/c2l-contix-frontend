/**
 * Formatação e validação de documentos e dados brasileiros.
 * A API guarda apenas os dígitos (exceto IE "ISENTO"); as máscaras são só de exibição.
 */

export const digits = (v: string | null | undefined) => (v ?? '').replace(/\D/g, '')

/** Aplica um padrão em que "0" é um dígito. Corta no último dígito digitado. */
function applyPattern(d: string, pattern: string) {
  let out = ''
  let i = 0
  for (const ch of pattern) {
    if (i >= d.length) break
    if (ch === '0') out += d[i++]
    else out += ch
  }
  return out
}

/* ---------- Formatação ---------- */

export const formatCpf = (v: string) => applyPattern(digits(v).slice(0, 11), '000.000.000-00')
export const formatCnpj = (v: string) => applyPattern(digits(v).slice(0, 14), '00.000.000/0000-00')
/** CPF até 11 dígitos; a partir do 12º, CNPJ. */
export const formatCpfCnpj = (v: string) => (digits(v).length <= 11 ? formatCpf(v) : formatCnpj(v))
export const formatPis = (v: string) => applyPattern(digits(v).slice(0, 11), '000.00000.00-0')
export const formatCep = (v: string) => applyPattern(digits(v).slice(0, 8), '00000-000')

/** Remove o "+55" e o DDI colado, deixando DDD + número. */
export function phoneDigits(v: string | null | undefined) {
  const raw = (v ?? '').trim()
  let d = digits(raw.startsWith('+55') ? raw.slice(3) : raw)
  if (!raw.startsWith('+') && d.length > 11 && d.startsWith('55')) d = d.slice(2)
  return d.slice(0, 11)
}

/** +55 (11) 91234-5678 ou +55 (11) 4000-0000. */
export function formatPhone(v: string | null | undefined) {
  const d = phoneDigits(v)
  if (!d) return ''
  const pattern = d.length <= 10 ? '(00) 0000-0000' : '(00) 00000-0000'
  return `+55 ${applyPattern(d, pattern)}`
}

/** Inscrição estadual: dígitos (com "P" inicial no produtor rural de SP) ou "ISENTO". */
export function formatIe(v: string | null | undefined) {
  const up = (v ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (/^[A-Z]+$/.test(up) && 'ISENTO'.startsWith(up)) return up
  const rural = up.startsWith('P') ? 'P' : ''
  return rural + digits(up).slice(0, 14)
}

export const formatIm = (v: string | null | undefined) => digits(v).slice(0, 15)

/* ---------- Validação (dígitos verificadores) ---------- */

const repeated = (d: string) => /^(\d)\1+$/.test(d)

export function isValidCpf(v: string) {
  const d = digits(v)
  if (d.length !== 11 || repeated(d)) return false
  const dv = (n: number) => {
    let s = 0
    for (let i = 0; i < n; i++) s += Number(d[i]) * (n + 1 - i)
    const r = (s * 10) % 11
    return r === 10 ? 0 : r
  }
  return dv(9) === Number(d[9]) && dv(10) === Number(d[10])
}

export function isValidCnpj(v: string) {
  const d = digits(v)
  if (d.length !== 14 || repeated(d)) return false
  const dv = (len: number) => {
    const w = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    const r = w.reduce((s, x, i) => s + Number(d[i]) * x, 0) % 11
    return r < 2 ? 0 : 11 - r
  }
  return dv(12) === Number(d[12]) && dv(13) === Number(d[13])
}

export const isValidCpfOrCnpj = (v: string) => isValidCpf(v) || isValidCnpj(v)

/** PIS/PASEP/NIT: pesos 3,2,9,8,7,6,5,4,3,2. */
export function isValidPis(v: string) {
  const d = digits(v)
  if (d.length !== 11 || repeated(d)) return false
  const w = [3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  const r = 11 - (w.reduce((s, x, i) => s + Number(d[i]) * x, 0) % 11)
  return (r >= 10 ? 0 : r) === Number(d[10])
}

export const isValidCep = (v: string) => /^\d{8}$/.test(digits(v)) && !repeated(digits(v))

const validDdd = (d: string) => /^[1-9][1-9]$/.test(d.slice(0, 2))

/** Celular: DDD + 9 + 8 dígitos. */
export function isValidMobile(v: string) {
  const d = phoneDigits(v)
  return d.length === 11 && validDdd(d) && d[2] === '9'
}

/** Fixo (DDD + 2..5 + 7 dígitos) ou celular. */
export function isValidPhone(v: string) {
  const d = phoneDigits(v)
  if (d.length === 10) return validDdd(d) && /[2-5]/.test(d[2])
  return isValidMobile(d)
}

export const isValidIe = (v: string) => /^(ISENTO|P?\d{2,14})$/.test(formatIe(v))

/* ---------- Unidades federativas ---------- */

export const UFS = [
  ['AC', 'Acre'], ['AL', 'Alagoas'], ['AP', 'Amapá'], ['AM', 'Amazonas'], ['BA', 'Bahia'],
  ['CE', 'Ceará'], ['DF', 'Distrito Federal'], ['ES', 'Espírito Santo'], ['GO', 'Goiás'],
  ['MA', 'Maranhão'], ['MT', 'Mato Grosso'], ['MS', 'Mato Grosso do Sul'], ['MG', 'Minas Gerais'],
  ['PA', 'Pará'], ['PB', 'Paraíba'], ['PR', 'Paraná'], ['PE', 'Pernambuco'], ['PI', 'Piauí'],
  ['RJ', 'Rio de Janeiro'], ['RN', 'Rio Grande do Norte'], ['RS', 'Rio Grande do Sul'],
  ['RO', 'Rondônia'], ['RR', 'Roraima'], ['SC', 'Santa Catarina'], ['SP', 'São Paulo'],
  ['SE', 'Sergipe'], ['TO', 'Tocantins'],
] as const

export const UF_OPTIONS = UFS.map(([value, name]) => ({ value, label: `${value} - ${name}` }))
export const isValidUf = (v: string) => UFS.some(([uf]) => uf === v.toUpperCase())
