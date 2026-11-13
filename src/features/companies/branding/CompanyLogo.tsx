import { Avatar } from '@/components/ui'
import { cn } from '@/lib/cn'
import type { CompanyBranding } from '@/types/domain'
import { useCompanyLogoUrl } from './useCompanyLogoUrl'

interface CompanyLogoProps {
  company: { id: string; legalName: string; tradeName: string | null; branding?: CompanyBranding | null }
  className?: string
}

/** Logotipo da empresa; sem logotipo, as iniciais na cor da empresa. */
export function CompanyLogo({ company, className }: CompanyLogoProps) {
  const url = useCompanyLogoUrl(company.id, company.branding)
  const name = company.tradeName || company.legalName
  if (url)
    return (
      <span
        className={cn(
          'flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white px-2 py-1',
          className,
          // Logotipos costumam ser horizontais: a altura vem do tamanho pedido e a largura acompanha a imagem.
          'w-auto min-w-11 max-w-28 sm:max-w-44',
        )}
      >
        <img src={url} alt={`Logotipo de ${name}`} className="h-full w-auto max-w-full object-contain" />
      </span>
    )
  return <Avatar name={name} className={cn('bg-brand-600 text-white', className)} />
}
