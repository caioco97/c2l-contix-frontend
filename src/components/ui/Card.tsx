import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <section className={cn('rounded-xl border border-slate-200 bg-white shadow-sm', className)} {...props} />
}

interface CardHeaderProps {
  title: ReactNode
  icon?: ReactNode
  action?: ReactNode
  className?: string
}

export function CardHeader({ title, icon, action, className }: CardHeaderProps) {
  return (
    <header className={cn('flex items-center justify-between gap-3 px-5 pt-5', className)}>
      <h2 className="flex items-center gap-2 text-lg font-semibold text-ink">
        {icon && <span className="text-brand-600">{icon}</span>}
        {title}
      </h2>
      {action}
    </header>
  )
}

export function CardBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-5', className)} {...props} />
}
