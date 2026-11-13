import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/cn'

interface DropdownMenuProps {
  trigger: (props: { open: boolean; toggle: () => void }) => ReactNode
  children: (close: () => void) => ReactNode
  align?: 'left' | 'right'
  className?: string
}

const GAP = 8
const VIEWPORT_MARGIN = 8
const HIDDEN: CSSProperties = { position: 'fixed', top: 0, left: 0, visibility: 'hidden' }

/**
 * O menu é renderizado num portal (document.body) com posição fixa, calculada a partir do gatilho.
 * Assim ele não é cortado por contêineres com overflow (tabelas, cards) e abre para cima quando
 * não há espaço abaixo.
 */
export function DropdownMenu({ trigger, children, align = 'right', className }: DropdownMenuProps) {
  const [open, setOpen] = useState(false)
  const [style, setStyle] = useState<CSSProperties>(HIDDEN)
  const ref = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (!open) return
    const place = () => {
      const anchor = ref.current?.getBoundingClientRect()
      const menu = menuRef.current
      if (!anchor || !menu) return
      const { offsetWidth: w, offsetHeight: h } = menu
      const vw = document.documentElement.clientWidth
      const vh = window.innerHeight

      let left = align === 'right' ? anchor.right - w : anchor.left
      left = Math.max(VIEWPORT_MARGIN, Math.min(left, vw - w - VIEWPORT_MARGIN))

      const below = anchor.bottom + GAP
      const above = anchor.top - GAP - h
      const top = below + h > vh - VIEWPORT_MARGIN && above >= VIEWPORT_MARGIN ? above : below

      setStyle({ position: 'fixed', top, left })
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open, align])

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node
      if (ref.current?.contains(target) || menuRef.current?.contains(target)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const toggle = () => {
    if (!open) setStyle(HIDDEN)
    setOpen(!open)
  }

  return (
    <div ref={ref} className="relative">
      {trigger({ open, toggle })}
      {open &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={style}
            className={cn(
              'z-50 min-w-56 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 text-left shadow-lg',
              className,
            )}
          >
            {children(() => setOpen(false))}
          </div>,
          document.body,
        )}
    </div>
  )
}

export function MenuItem({
  icon,
  children,
  onClick,
  active,
}: {
  icon?: ReactNode
  children: ReactNode
  onClick?: () => void
  active?: boolean
}) {
  return (
    <button
      role="menuitem"
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50',
        active ? 'font-medium text-brand-700' : 'text-slate-700',
      )}
    >
      {icon && <span className="text-slate-400">{icon}</span>}
      {children}
    </button>
  )
}
