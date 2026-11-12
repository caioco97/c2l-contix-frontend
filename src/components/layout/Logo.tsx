import { cn } from '@/lib/cn'

export function Logo({ variant = 'dark', className }: { variant?: 'dark' | 'light'; className?: string }) {
  const light = variant === 'light'
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden>
        <rect width="32" height="32" rx="8" fill={light ? '#ffffff' : '#167f74'} />
        <path
          d="M21.5 11.2A7 7 0 1 0 21.5 20.8"
          fill="none"
          stroke={light ? '#167f74' : '#ffffff'}
          strokeWidth="3.2"
          strokeLinecap="round"
        />
        <circle cx="22" cy="16" r="2" fill={light ? '#42baa8' : '#78d5c4'} />
      </svg>
      <span className={cn('text-xl font-bold tracking-tight', light ? 'text-white' : 'text-ink')}>Contix</span>
    </span>
  )
}
