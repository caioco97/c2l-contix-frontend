import { Avatar, Skeleton } from '@/components/ui'
import { cn } from '@/lib/cn'
import { useActiveCompany } from './ActiveCompanyContext'
import { CompanySwitcher } from './CompanySwitcher'

/** Faixa com a empresa ativa (nome e apelido), exibida no topo das telas do portal. */
export function CompanyBanner({ className }: { className?: string }) {
  const { company, isLoading } = useActiveCompany()

  return (
    <div className={cn('border-b border-slate-200 bg-white', className)}>
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-4 sm:px-6">
        {isLoading || !company ? (
          <Skeleton className="h-10 w-72" />
        ) : (
          <>
            <Avatar name={company.tradeName} className="h-11 w-11 bg-slate-600 text-white" />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Empresa</p>
              <CompanySwitcher label="" />
              <p className="text-xs text-slate-500">{company.nickname}</p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
