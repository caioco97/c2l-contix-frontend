import { api } from '@/lib/api'
import { env } from '@/config/env'
import { mockDelay, mockError } from '@/lib/mock'
import { mockUser } from '@/mocks/data'
import type { CurrentUser, LoginRequest, LoginResponse } from '@/types/auth'

function fakeTokens() {
  return {
    accessToken: `mock-access-${crypto.randomUUID()}`,
    refreshToken: `mock-refresh-${crypto.randomUUID()}`,
    expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
  }
}

export const authApi = {
  async login(body: LoginRequest): Promise<LoginResponse> {
    if (env.useMocks) {
      if (body.password !== '123456') return mockError(401, 'E-mail ou senha inválidos.')
      return mockDelay({ ...fakeTokens(), user: { ...mockUser, email: body.email } }, 600)
    }
    const { data } = await api.post<LoginResponse>('/auth/login', body)
    return data
  },

  async me(): Promise<CurrentUser> {
    if (env.useMocks) return mockDelay(mockUser, 200)
    const { data } = await api.get<CurrentUser>('/auth/me')
    return data
  },

  async logout(refreshToken: string): Promise<void> {
    if (env.useMocks) return mockDelay(undefined, 100)
    await api.post('/auth/logout', { refreshToken })
  },

  async forgotPassword(email: string): Promise<void> {
    if (env.useMocks) return mockDelay(undefined, 600)
    await api.post('/auth/forgot-password', { email })
  },

  async resetPassword(body: { token: string; password: string }): Promise<void> {
    if (env.useMocks) return mockDelay(undefined, 600)
    await api.post('/auth/reset-password', body)
  },
}
