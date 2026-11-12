import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { env } from '@/config/env'
import { tokenStorage } from '@/lib/tokenStorage'
import type { AuthTokens } from '@/types/auth'
import type { ProblemDetails } from '@/types/api'
import type { TokensDto } from '@/types/dto'

export const api = axios.create({
  baseURL: env.apiUrl,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const tokens = tokenStorage.get()
  if (tokens?.accessToken) config.headers.Authorization = `Bearer ${tokens.accessToken}`
  return config
})

/* ---------- Refresh token com fila (single-flight) ---------- */

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean }

let refreshPromise: Promise<AuthTokens> | null = null
let onSessionExpired: () => void = () => {}

/** Registrado pelo AuthProvider para redirecionar ao login quando o refresh falhar. */
export function registerSessionExpiredHandler(handler: () => void) {
  onSessionExpired = handler
}

async function refreshTokens(): Promise<AuthTokens> {
  const current = tokenStorage.get()
  if (!current?.refreshToken) throw new Error('Sem refresh token')
  // Usa axios "cru" para não passar pelos interceptors.
  const { data } = await axios.post<TokensDto>(`${env.apiUrl}/auth/refresh`, {
    refreshToken: current.refreshToken,
  })
  const tokens: AuthTokens = {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    expiresAt: data.accessTokenExpiraEm,
  }
  tokenStorage.set(tokens)
  return tokens
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined
    const isAuthCall = original?.url?.includes('/auth/')

    if (error.response?.status !== 401 || !original || original._retry || isAuthCall) {
      return Promise.reject(error)
    }

    original._retry = true
    try {
      refreshPromise ??= refreshTokens().finally(() => {
        refreshPromise = null
      })
      const tokens = await refreshPromise
      original.headers.Authorization = `Bearer ${tokens.accessToken}`
      return api(original)
    } catch (refreshError) {
      tokenStorage.clear()
      onSessionExpired()
      return Promise.reject(refreshError)
    }
  },
)

/** Extrai uma mensagem amigável de um erro da API (ProblemDetails). */
export function getErrorMessage(error: unknown, fallback = 'Algo deu errado. Tente novamente.') {
  if (axios.isAxiosError(error) || (error as AxiosError)?.isAxiosError) {
    const data = (error as AxiosError<ProblemDetails>).response?.data
    if (data?.errors) return Object.values(data.errors).flat()[0] ?? data.title
    if (data?.detail) return data.detail
    if (data?.title) return data.title
    if (!(error as AxiosError).response) return 'Não foi possível conectar ao servidor.'
  }
  return fallback
}
