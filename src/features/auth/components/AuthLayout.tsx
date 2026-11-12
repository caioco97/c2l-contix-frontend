import type { ReactNode } from 'react'
import { CalendarClock, FileCheck2, MessagesSquare } from 'lucide-react'
import { Logo } from '@/components/layout/Logo'

const highlights = [
  { icon: FileCheck2, text: 'Documentos organizados por pasta, com aviso de leitura.' },
  { icon: CalendarClock, text: 'Calendário de vencimentos sempre à vista.' },
  { icon: MessagesSquare, text: 'Solicitações ao escritório com histórico e status.' },
]

const YEAR = new Date().getFullYear()

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="grid min-h-full lg:grid-cols-[1fr_minmax(0,560px)]">
      <aside className="relative hidden overflow-hidden bg-brand-900 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-brand-700/50" aria-hidden />
        <div className="absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-brand-800/60" aria-hidden />
        <Logo variant="light" className="relative" />
        <div className="relative max-w-md space-y-6">
          <h1 className="text-3xl font-semibold leading-tight">Seu escritório contábil e sua empresa, no mesmo lugar.</h1>
          <ul className="space-y-4">
            {highlights.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3 text-brand-100">
                <Icon className="mt-0.5 h-5 w-5 shrink-0 text-brand-300" />
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm text-brand-200">© {YEAR} Contix</p>
      </aside>

      <main className="flex items-center justify-center bg-white px-4 py-10 sm:px-10">
        <div className="w-full max-w-sm">
          <Logo className="mb-10 lg:hidden" />
          <h2 className="text-2xl font-semibold text-ink">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
          <div className="mt-8">{children}</div>
        </div>
      </main>
    </div>
  )
}
