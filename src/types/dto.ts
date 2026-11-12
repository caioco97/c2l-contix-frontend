/**
 * Contratos da API .NET (/api/v1), em português, exatamente como trafegam.
 * As telas usam os tipos de `domain.ts`; a conversão fica nos `api.ts` de cada feature.
 */

export type PerfilDto = 'Administrador' | 'Colaborador' | 'Cliente'

export interface UsuarioDto {
  id: string
  nome: string
  email: string
  perfil: PerfilDto
  escritorio: { id: string; nome: string; logoUrl?: string | null }
}

export interface TokensDto {
  accessToken: string
  accessTokenExpiraEm: string
  refreshToken: string
  refreshTokenExpiraEm: string
}

export interface LoginResponseDto extends TokensDto {
  usuario: UsuarioDto
}

export interface PagedDto<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface EmpresaDto {
  id: string
  razaoSocial: string
  nomeFantasia: string | null
  apelido: string | null
  documento: string
  regimeTributario?: string
  situacao?: string
}

export interface PastaDto {
  id: string
  nome: string
  pastaPaiId: string | null
  ordem: number
  permiteUploadCliente: boolean
  documentosNaoLidos: number
  subpastas: PastaDto[]
}

export interface DocumentoDto {
  id: string
  pastaId: string
  nome: string
  nomeArquivoOriginal: string
  contentType: string
  tamanhoBytes: number
  comentario: string | null
  competencia: string | null
  dataVencimento: string | null
  publicadoEm: string
  adicionadoPorNome: string
  updatedAt: string | null
  lido: boolean
  lidoEm: string | null
}

export interface VencimentoDto {
  documentoId: string
  nome: string
  dataVencimento: string
  pastaId: string
  caminhoPasta: string
  lido: boolean
}
