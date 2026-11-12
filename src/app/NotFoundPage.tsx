import { Link } from 'react-router-dom'
import { Button } from '@/components/ui'

export function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-4 text-center">
      <p className="text-5xl font-bold text-brand-600">404</p>
      <h1 className="text-xl font-semibold text-ink">Página não encontrada</h1>
      <p className="text-sm text-slate-500">O endereço pode ter mudado ou não existe mais.</p>
      <Link to="/">
        <Button className="mt-2">Voltar ao início</Button>
      </Link>
    </div>
  )
}
