import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { registerSessionExpiredHandler } from '@/lib/api'
import { tokenStorage } from '@/lib/tokenStorage'
import type { CurrentUser, LoginRequest } from '@/types/auth'
import { authApi } from './api'

type Status = 'loading' | 'authenticated' | 'anonymous'

interface AuthContextValue {
  status: Status
  user: CurrentUser | null
  login: (body: LoginRequest) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [status, setStatus] = useState<Status>(() => (tokenStorage.get() ? 'loading' : 'anonymous'))

  const clearSession = useCallback(() => {
    tokenStorage.clear()
    queryClient.clear()
    setUser(null)
    setStatus('anonymous')
  }, [queryClient])

  // Restaura a sessão ao recarregar a página.
  useEffect(() => {
    if (status !== 'loading') return
    authApi
      .me()
      .then((me) => {
        setUser(me)
        setStatus('authenticated')
      })
      .catch(clearSession)
  }, [status, clearSession])

  useEffect(() => registerSessionExpiredHandler(clearSession), [clearSession])

  const login = useCallback(async (body: LoginRequest) => {
    const { user: me, ...tokens } = await authApi.login(body)
    tokenStorage.set(tokens)
    setUser(me)
    setStatus('authenticated')
  }, [])

  const logout = useCallback(async () => {
    const refresh = tokenStorage.get()?.refreshToken
    if (refresh) await authApi.logout(refresh).catch(() => undefined)
    clearSession()
  }, [clearSession])

  const value = useMemo(() => ({ status, user, login, logout }), [status, user, login, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return ctx
}
