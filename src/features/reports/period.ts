/** Primeiro e último dia do mês corrente (yyyy-MM-dd), no fuso local. */
export function currentMonth() {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const y = now.getFullYear()
  const m = now.getMonth() + 1
  const last = new Date(y, m, 0).getDate()
  return { from: `${y}-${pad(m)}-01`, until: `${y}-${pad(m)}-${pad(last)}` }
}
