import { useQuery } from '@tanstack/react-query'
import { useObjectUrl } from '@/lib/useBlobUrl'
import type { CompanyBranding } from '@/types/domain'
import { companiesApi, companyKeys } from '../api'

/** Object URL do logotipo da empresa, ou null quando ela não tem logotipo. */
export function useCompanyLogoUrl(companyId: string | undefined, branding: CompanyBranding | null | undefined) {
  const enabled = !!companyId && !!branding?.hasLogo
  const { data } = useQuery({
    queryKey: companyKeys.logo(companyId ?? '', branding?.logoVersion ?? null),
    queryFn: () => companiesApi.logo(companyId!),
    enabled,
    staleTime: Infinity,
    retry: false,
  })
  return useObjectUrl(enabled ? data : null)
}
