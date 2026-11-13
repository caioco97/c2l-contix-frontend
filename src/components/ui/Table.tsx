import type { HTMLAttributes, ThHTMLAttributes, TdHTMLAttributes } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { cn } from '@/lib/cn'

export function Table({ className, ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={cn('w-full border-collapse text-sm', className)} {...props} />
    </div>
  )
}

export function THead(props: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className="border-b border-slate-200 bg-slate-50 text-left" {...props} />
}

export function TBody(props: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className="divide-y divide-slate-100" {...props} />
}

export function Tr({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  // Linhas clicáveis (com onClick) ganham o cursor de mãozinha automaticamente.
  return (
    <tr
      className={cn('transition-colors hover:bg-slate-50', props.onClick && 'cursor-pointer', className)}
      {...props}
    />
  )
}

export function Th({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className={cn('whitespace-nowrap px-4 py-3 font-semibold text-slate-600', className)} {...props} />
}

export function Td({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn('px-4 py-3 align-middle text-slate-700', className)} {...props} />
}

export type SortDirection = 'asc' | 'desc'

interface SortableThProps extends ThHTMLAttributes<HTMLTableCellElement> {
  active: boolean
  direction: SortDirection
  onSort: () => void
}

export function SortableTh({ active, direction, onSort, children, className, ...props }: SortableThProps) {
  const Icon = !active ? ArrowUpDown : direction === 'asc' ? ArrowUp : ArrowDown
  return (
    <Th
      aria-sort={active ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'}
      className={className}
      {...props}
    >
      <button type="button" onClick={onSort} className="inline-flex cursor-pointer items-center gap-1 hover:text-ink">
        {children}
        <Icon className={cn('h-3.5 w-3.5', active ? 'text-brand-600' : 'text-slate-300')} />
      </button>
    </Th>
  )
}
