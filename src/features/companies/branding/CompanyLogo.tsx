import { useState } from 'react'
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
  // Logotipos quadrados (selo, ícone) preenchem o espaço todo; horizontais ganham moldura branca.
  const [square, setSquare] = useState(false)
  const name = company.tradeName || company.legalName
  if (url)
    return (
      <span
        className={cn(
          'flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white',
          className,
          square ? 'aspect-square w-auto p-0' : 'w-auto min-w-11 max-w-28 px-2 py-1 sm:max-w-44',
        )}
      >
        <img
          src={url}
          alt={`Logotipo de ${name}`}
          onLoad={(e) => setSquare(e.currentTarget.naturalWidth <= e.currentTarget.naturalHeight * 1.25)}
          className={cn('h-full max-w-full', square ? 'w-full object-cover' : 'w-auto object-contain')}
        />
      </span>
    )
  return <Avatar name={name} className={cn('bg-brand-600 text-white', className)} />
}
