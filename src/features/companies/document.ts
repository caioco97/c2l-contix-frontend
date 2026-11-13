export const digits = (v: string) => v.replace(/\D/g, '')

/** Dígitos verificadores de CPF (11) ou CNPJ (14). A API valida de novo. */
export function isValidCpfOrCnpj(value: string) {
  const d = digits(value)
  if (!/^\d+$/.test(d) || /^(\d)\1+$/.test(d)) return false
  const dv = (base: string, weights: number[]) => {
    const r = base.split('').reduce((s, n, i) => s + Number(n) * weights[i], 0) % 11
    return r < 2 ? 0 : 11 - r
  }
  if (d.length === 11) {
    const calc = (len: number) => {
      const s = d.slice(0, len).split('').reduce((acc, n, i) => acc + Number(n) * (len + 1 - i), 0)
      const r = (s * 10) % 11
      return r === 10 ? 0 : r
    }
    return calc(9) === Number(d[9]) && calc(10) === Number(d[10])
  }
  if (d.length === 14) {
    const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    const w2 = [6, ...w1]
    return dv(d.slice(0, 12), w1) === Number(d[12]) && dv(d.slice(0, 13), w2) === Number(d[13])
  }
  return false
}
