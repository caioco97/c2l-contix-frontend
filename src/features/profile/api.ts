import { api } from '@/lib/api'
import { env } from '@/config/env'
import { phoneDigits } from '@/lib/br'
import { mockDelay, mockError } from '@/lib/mock'
import { mockUser } from '@/mocks/data'
import type { AuthTokens, CurrentUser } from '@/types/auth'
import type { LoginResponseDto, UsuarioDto } from '@/types/dto'
import { toCurrentUser, toTokens } from '@/features/auth/mappers'

export interface ProfileInput {
  name: string
  email: string
  /** Com ou sem máscara; vazio remove o telefone. */
  phone: string
}

export const profileKeys = {
  photo: (userId: string, version: string | null | undefined) => ['profile', 'photo', userId, version] as const,
}

/** PNG, JPG ou WEBP (SVG fica de fora: pode conter script). */
export const PHOTO_TYPES = ['image/png', 'image/jpeg', 'image/webp']
export const MAX_PHOTO = 1024 * 1024

let mockPhoto: Blob | null = null
const MOCK_PASSWORD = { value: '123456' }

/** Meu perfil (CTX-117): dados, foto e senha do usuário logado. */
export const profileApi = {
  async update(input: ProfileInput): Promise<CurrentUser> {
    const body = { nome: input.name.trim(), email: input.email.trim(), telefone: phoneDigits(input.phone) || null }
    if (env.useMocks) {
      if (body.email.toLowerCase() === 'em-uso@contix.com.br') return mockError(409, 'Este e-mail já está em uso.')
      Object.assign(mockUser, { name: body.nome, email: body.email.toLowerCase(), phone: body.telefone })
      return mockDelay({ ...mockUser })
    }
    const { data } = await api.put<UsuarioDto>('/perfil', body)
    return toCurrentUser(data)
  },

  async uploadPhoto(file: File): Promise<CurrentUser> {
    if (env.useMocks) {
      mockPhoto = file
      Object.assign(mockUser, { photoVersion: String(Date.now()) })
      return mockDelay({ ...mockUser })
    }
    const form = new FormData()
    form.append('arquivo', file)
    // O cliente HTTP manda JSON por padrão: sem este cabeçalho o axios converte o FormData em JSON e a API responde 415.
    const { data } = await api.put<UsuarioDto>('/perfil/foto', form, { headers: { 'Content-Type': 'multipart/form-data' } })
    return toCurrentUser(data)
  },

  async removePhoto(): Promise<CurrentUser> {
    if (env.useMocks) {
      mockPhoto = null
      Object.assign(mockUser, { photoVersion: null })
      return mockDelay({ ...mockUser })
    }
    const { data } = await api.delete<UsuarioDto>('/perfil/foto')
    return toCurrentUser(data)
  },

  /** Foto do usuário logado (exige o token, por isso vem como blob). */
  async photo(): Promise<Blob> {
    if (env.useMocks) return mockPhoto ? mockDelay(mockPhoto, 100) : mockError(404, 'Foto não encontrada.')
    const { data } = await api.get<Blob>('/perfil/foto', { responseType: 'blob' })
    return data
  },

  /** Troca a senha. A API encerra as outras sessões e devolve tokens novos para esta. */
  async changePassword(body: { currentPassword: string; newPassword: string }): Promise<{ tokens: AuthTokens; user: CurrentUser }> {
    if (env.useMocks) {
      if (body.currentPassword !== MOCK_PASSWORD.value) return mockError(400, 'Senha atual incorreta.')
      MOCK_PASSWORD.value = body.newPassword
      const tokens = {
        accessToken: `mock-access-${crypto.randomUUID()}`,
        refreshToken: `mock-refresh-${crypto.randomUUID()}`,
        expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
      }
      return mockDelay({ tokens, user: { ...mockUser } }, 500)
    }
    const { data } = await api.post<LoginResponseDto>('/auth/trocar-senha', {
      senhaAtual: body.currentPassword,
      novaSenha: body.newPassword,
    })
    return { tokens: toTokens(data), user: toCurrentUser(data.usuario) }
  },
}
