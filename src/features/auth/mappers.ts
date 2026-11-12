import type { AuthTokens, CurrentUser, UserRole } from '@/types/auth'
import type { PerfilDto, TokensDto, UsuarioDto } from '@/types/dto'

const roles: Record<PerfilDto, UserRole> = {
  Administrador: 'Admin',
  Colaborador: 'Collaborator',
  Cliente: 'Client',
}

export function toCurrentUser(dto: UsuarioDto): CurrentUser {
  return {
    id: dto.id,
    name: dto.nome,
    email: dto.email,
    role: roles[dto.perfil],
    office: { id: dto.escritorio.id, name: dto.escritorio.nome, logoUrl: dto.escritorio.logoUrl },
  }
}

export function toTokens(dto: TokensDto): AuthTokens {
  return { accessToken: dto.accessToken, refreshToken: dto.refreshToken, expiresAt: dto.accessTokenExpiraEm }
}
