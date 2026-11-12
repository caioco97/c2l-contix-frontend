import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean
  leftIcon?: ReactNode
}

export const inputBase =
  'w-full rounded-lg border bg-white px-3 text-sm text-ink placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 disabled:bg-slate-100'

export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, invalid, leftIcon, ...props }, ref) => (
  <div className="relative">
    {leftIcon && (
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">{leftIcon}</span>
    )}
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        inputBase,
        'h-10',
        invalid ? 'border-red-400 focus:ring-red-200' : 'border-slate-300 focus:border-brand-500 focus:ring-brand-100',
        leftIcon && 'pl-9',
        className,
      )}
      {...props}
    />
  </div>
))
Input.displayName = 'Input'
