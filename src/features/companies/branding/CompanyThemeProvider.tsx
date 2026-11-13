import { useEffect } from 'react'
import { useAuth } from '@/features/auth/AuthContext'
import { useActiveCompany } from '../ActiveCompanyContext'
import { themeVars } from './theme'

/**
 * Aplica a identidade visual da empresa selecionada no portal do cliente. O escritório sempre
 * vê o visual padrão do Contix, mesmo ao abrir telas do portal com uma empresa selecionada.
 */
export function CompanyThemeProvider() {
  const { user } = useAuth()
  const { company } = useActiveCompany()
  const isClient = user?.role === 'Client'
  const primary = isClient ? company?.branding?.primaryColor : null
  const secondary = isClient ? company?.branding?.secondaryColor : null

  useEffect(() => {
    const vars = themeVars(primary, secondary)
    const root = document.documentElement
    for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v)
    return () => {
      for (const k of Object.keys(vars)) root.style.removeProperty(k)
    }
  }, [primary, secondary])

  return null
}
