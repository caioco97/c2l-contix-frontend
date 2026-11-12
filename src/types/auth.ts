export type UserRole = 'Admin' | 'Collaborator' | 'Client'

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  /** ISO date-time em que o access token expira */
  expiresAt: string
}

export interface CurrentUser {
  id: string
  name: string
  email: string
  role: UserRole
  office: { id: string; name: string; logoUrl?: string | null }
}

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse extends AuthTokens {
  user: CurrentUser
}
