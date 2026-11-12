import type { Cnd } from '@/types/domain'

/** "Vence em 5 dias", "Venceu há 20 dias", "Vence hoje". */
export function expiryText(cnd: Pick<Cnd, 'daysToExpire'>) {
  const d = cnd.daysToExpire
  if (d === 0) return 'Vence hoje'
  if (d < 0) return `Venceu há ${-d} dia${d === -1 ? '' : 's'}`
  return `Vence em ${d} dia${d === 1 ? '' : 's'}`
}
