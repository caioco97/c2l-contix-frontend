import { cn } from '@/lib/cn'

export interface TabItem<T extends string> {
  value: T
  label: string
  count?: number
}

interface TabsProps<T extends string> {
  items: TabItem<T>[]
  value: T
  onChange: (value: T) => void
  className?: string
}

/** Abas sublinhadas (ex.: Não lidos / Lidos). */
export function Tabs<T extends string>({ items, value, onChange, className }: TabsProps<T>) {
  return (
    <div role="tablist" className={cn('flex gap-1 border-b border-slate-200', className)}>
      {items.map((item) => {
        const active = item.value === value
        return (
          <button
            key={item.value}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(item.value)}
            className={cn(
              '-mb-px flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition-colors',
              active ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-ink',
            )}
          >
            {item.label}
            {item.count !== undefined && item.count > 0 && (
              <span
                className={cn(
                  'rounded-full px-1.5 text-xs',
                  active ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-600',
                )}
              >
                {item.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

/** Grupo de botões segmentado (ex.: Todos / Não lidos / Lidos). */
export function SegmentedControl<T extends string>({ items, value, onChange, className }: TabsProps<T>) {
  return (
    <div role="radiogroup" className={cn('inline-flex rounded-lg bg-slate-100 p-0.5', className)}>
      {items.map((item) => {
        const active = item.value === value
        return (
          <button
            key={item.value}
            role="radio"
            type="button"
            aria-checked={active}
            onClick={() => onChange(item.value)}
            className={cn(
              'rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors',
              active ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-ink',
            )}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
