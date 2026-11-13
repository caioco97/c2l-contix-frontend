import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { Company } from '@/types/domain'
import { companiesApi } from './api'

const STORAGE_KEY = 'contix.activeCompanyId'

interface ActiveCompanyValue {
  companies: Company[]
  company: Company | null
  isLoading: boolean
  /** Há mais de uma empresa e nenhuma foi escolhida ainda: as telas pedem a seleção. */
  needsSelection: boolean
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

  // Com uma empresa só, ela já vem selecionada. Com várias, o usuário escolhe (a escolha fica salva).
  const company = companies.find((c) => c.id === selectedId) ?? (companies.length === 1 ? companies[0] : null)
  const needsSelection = !isLoading && !company && companies.length > 1

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

  const value = useMemo(
    () => ({ companies, company, isLoading, needsSelection, setCompany }),
    [companies, company, isLoading, needsSelection, setCompany],
  )
  return <ActiveCompanyContext.Provider value={value}>{children}</ActiveCompanyContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useActiveCompany() {
  const ctx = useContext(ActiveCompanyContext)
  if (!ctx) throw new Error('useActiveCompany deve ser usado dentro de ActiveCompanyProvider')
  return ctx
}
