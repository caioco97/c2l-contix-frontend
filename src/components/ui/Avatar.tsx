import { cn } from '@/lib/cn'
import { initials } from '@/lib/format'

/** Iniciais do nome, ou a foto quando `src` é informado. */
export function Avatar({ name, src, className }: { name: string; src?: string | null; className?: string }) {
  if (src) {
    return (
      <img
        src={src}
        alt=""
        aria-hidden
        className={cn('inline-block h-9 w-9 shrink-0 rounded-full bg-slate-100 object-cover', className)}
      />
    )
  }
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700',
        className,
      )}
    >
      {initials(name)}
    </span>
  )
}
