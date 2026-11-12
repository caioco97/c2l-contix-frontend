import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { Company } from '@/types/domain'
import { companiesApi } from './api'

const STORAGE_KEY = 'contix.activeCompanyId'

interface ActiveCompanyValue {
  companies: Company[]
  company: Company | null
  isLoading: boolean
  setCompany: (id: string) => void
}

const ActiveCompanyContext = createContext<ActiveCompanyValue | null>(null)

function readStored() {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export function ActiveCompanyProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const { data: companies = [], isLoading } = useQuery({
    queryKey: ['companies', 'mine'],
    queryFn: companiesApi.listMine,
    staleTime: 5 * 60_000,
  })
  const [selectedId, setSelectedId] = useState<string | null>(readStored)

  const company = companies.find((c) => c.id === selectedId) ?? companies[0] ?? null

  useEffect(() => {
    if (!company) return
    try {
      localStorage.setItem(STORAGE_KEY, company.id)
    } catch {
      /* ignore */
    }
  }, [company])

  const setCompany = useCallback(
    (id: string) => {
      setSelectedId(id)
      // Dados por empresa são recarregados (queries usam o id na chave).
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] !== 'companies' })
    },
    [queryClient],
  )

  const value = useMemo(() => ({ companies, company, isLoading, setCompany }), [companies, company, isLoading, setCompany])
  return <ActiveCompanyContext.Provider value={value}>{children}</ActiveCompanyContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useActiveCompany() {
  const ctx = useContext(ActiveCompanyContext)
  if (!ctx) throw new Error('useActiveCompany deve ser usado dentro de ActiveCompanyProvider')
  return ctx
}
