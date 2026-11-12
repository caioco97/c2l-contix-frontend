import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export const Checkbox = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      type="checkbox"
      className={cn('h-4 w-4 cursor-pointer rounded border-slate-300 accent-brand-600', className)}
      {...props}
    />
  ),
)
Checkbox.displayName = 'Checkbox'
