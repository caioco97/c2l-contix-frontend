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
  /** Só para o usuário do cliente: módulos liberados nesta empresa. */
  modulos?: ModuloPortalDto[] | null
}

export type ModuloPortalDto = 'Documentos' | 'Solicitacoes' | 'NFe'

export interface EnderecoDto {
  cep: string | null
  logradouro: string | null
  numero: string | null
  complemento: string | null
  bairro: string | null
  cidade: string | null
  uf: string | null
}

export interface EmpresaDetalheDto {
  id: string
  razaoSocial: string
  nomeFantasia: string | null
  apelido: string | null
  documento: string
  inscricaoEstadual: string | null
  inscricaoMunicipal: string | null
  regimeTributario: RegimeTributarioDto
  situacao: 'Ativa' | 'Inativa' | 'Suspensa' | 'Baixada'
  email: string | null
  telefone: string | null
  endereco: EnderecoDto | null
  createdAt: string
}

export interface PainelEmpresaDto {
  usuariosAtivos: number
  convitesPendentes: number
  documentosNaoVistosPeloCliente: number
  documentosRecebidosNaoLidos: number
  solicitacoesEmAberto: number
  solicitacoesAtrasadas: number
  certidoesVencidas: number
  certidoesAVencer: number
}

export interface ItemHistoricoEmpresaDto {
  id: string
  categoria: 'Documento' | 'Solicitacao' | 'Certidao' | 'Usuario'
  tipo: string
  ocorridoEm: string
  usuarioNome: string | null
  ehDoEscritorio: boolean | null
  titulo: string
  detalhe: string | null
  referenciaId: string | null
  pastaId: string | null
}

export interface HistoricoEmpresaDto {
  itens: ItemHistoricoEmpresaDto[]
  proximoAntesDe: string | null
}

export interface UsuarioPortalDto {
  id: string
  nome: string
  email: string
  ativo: boolean
  convitePendente: boolean
  conviteEnviadoEm: string | null
  ultimoLoginEm: string | null
  vinculadoEm: string
  modulos: ModuloPortalDto[]
  todasAsPastas: boolean
  pastaIds: string[]
  outrasEmpresas: number
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
  origem: OrigemDocumento
  visualizacoesDestinatarios: number
}

export type OrigemDocumento = 'Escritorio' | 'Cliente'

export interface AcessoDocumentoDto {
  usuarioId: string
  nome: string
  email: string
  ehDoEscritorio: boolean
  visualizadoEm: string | null
  ultimoDownloadEm: string | null
  downloads: number
  destinatario: boolean
}

export interface AcessosDocumentoDto {
  documentoId: string
  origem: OrigemDocumento
  totalDestinatarios: number
  destinatariosQueVisualizaram: number
  usuarios: AcessoDocumentoDto[]
}

export type TipoEventoDocumento = 'Upload' | 'Visualizacao' | 'Download' | 'Envio' | 'Exclusao'

export interface EventoDocumentoDto {
  id: string
  tipo: TipoEventoDocumento
  ocorridoEm: string
  usuarioId: string
  usuarioNome: string
  ehDoEscritorio: boolean
  detalhe: string | null
}

export interface VencimentoDto {
  documentoId: string
  nome: string
  dataVencimento: string
  pastaId: string
  caminhoPasta: string
  lido: boolean
}

/* ---------- Solicitações de serviço ---------- */

export type StatusSolicitacaoDto = 'Aberta' | 'EmAnalise' | 'AguardandoCliente' | 'Concluida' | 'Cancelada'
export type DepartamentoDto = 'Contabil' | 'Fiscal' | 'Pessoal' | 'Societario' | 'Financeiro'
export type TipoSolicitacaoCodigo =
  | 'Geral'
  | 'CadastroEmpregado'
  | 'CadastroContribuinte'
  | 'CadastroEstagiario'
  | 'AvisoFerias'
  | 'CalculoFerias'
  | 'AvisoRescisao'
  | 'CalculoRescisao'
  | 'Afastamento'
  | 'LancamentoRubricas'

export interface TipoSolicitacaoDto {
  codigo: TipoSolicitacaoCodigo
  nome: string
  descricao: string
  departamento: DepartamentoDto
  prazoDias: number
  exigeAnexo: boolean
  orientacaoAnexo: string | null
}

export interface SolicitacaoResumoDto {
  id: string
  numero: number
  empresaId: string
  empresaNome: string
  tipo: TipoSolicitacaoCodigo
  tipoNome: string
  assunto: string
  departamento: DepartamentoDto
  status: StatusSolicitacaoDto
  solicitanteId: string
  solicitanteNome: string
  responsavelId: string | null
  responsavelNome: string | null
  prazo: string | null
  atrasada: boolean
  createdAt: string
  updatedAt: string | null
}

export interface AnexoDto {
  id: string
  nomeArquivo: string
  contentType: string
  tamanhoBytes: number
  enviadoPorNome: string
  createdAt: string
}

export interface InteracaoDto {
  id: string
  tipo: 'Abertura' | 'Comentario' | 'MudancaStatus' | 'Atribuicao'
  mensagem: string | null
  statusAnterior: StatusSolicitacaoDto | null
  statusNovo: StatusSolicitacaoDto | null
  autorId: string
  autorNome: string
  autorEhEscritorio: boolean
  createdAt: string
  anexos: AnexoDto[]
}

export interface SolicitacaoDto extends SolicitacaoResumoDto {
  descricao: string | null
  dados: Record<string, unknown> | null
  finalizadaEm: string | null
  transicoesPermitidas: StatusSolicitacaoDto[]
  historico: InteracaoDto[]
}

export interface UsuarioResumoDto {
  id: string
  nome: string
  email: string
  perfil: PerfilDto
  ativo: boolean
}

/* ---------- Notificações ---------- */

export type TipoNotificacaoDto =
  | 'NovoDocumento'
  | 'VencimentoProximo'
  | 'NovaSolicitacao'
  | 'SolicitacaoAtualizada'
  | 'NovaNoticia'
  | 'CertidaoVencimento'

export interface NotificacaoDto {
  id: string
  tipo: TipoNotificacaoDto
  titulo: string
  mensagem: string
  link: string | null
  empresaId: string | null
  referenciaId: string | null
  lida: boolean
  lidaEm: string | null
  criadaEm: string
}

export interface PreferenciaNotificacaoDto {
  tipo: TipoNotificacaoDto
  descricao: string
  receberEmail: boolean
}

/* ---------- Notícias ---------- */

export type SituacaoNoticiaDto = 'Agendada' | 'Publicada' | 'Expirada'
export type PublicoNoticiaDto = 'Todos' | 'EmpresasSelecionadas' | 'RegimeTributario'
export type RegimeTributarioDto = 'SimplesNacional' | 'LucroPresumido' | 'LucroReal' | 'MEI' | 'Imune' | 'Isento' | 'Outro'

export interface NoticiaAnexoDto {
  id: string
  nomeArquivo: string
  contentType: string
  tamanhoBytes: number
}

export interface NoticiaPortalDto {
  id: string
  titulo: string
  resumo: string
  publicadaEm: string
  possuiImagem: boolean
  quantidadeAnexos: number
  lida: boolean
  lidaEm: string | null
}

export interface NoticiaPortalDetalheDto extends Omit<NoticiaPortalDto, 'quantidadeAnexos'> {
  conteudo: string
  anexos: NoticiaAnexoDto[]
}

export interface NoticiaResumoDto {
  id: string
  titulo: string
  resumo: string
  publicarEm: string
  expiraEm: string | null
  situacao: SituacaoNoticiaDto
  publico: PublicoNoticiaDto
  possuiImagem: boolean
  quantidadeAnexos: number
  autorNome: string
  empresasDestinatarias: number
  empresasLeram: number
  createdAt: string
  updatedAt: string | null
}

export interface NoticiaDto {
  id: string
  titulo: string
  resumo: string | null
  conteudo: string
  publicarEm: string
  expiraEm: string | null
  situacao: SituacaoNoticiaDto
  publico: PublicoNoticiaDto
  regimes: RegimeTributarioDto[]
  empresas: { id: string; nome: string }[]
  possuiImagem: boolean
  anexos: NoticiaAnexoDto[]
  autorId: string
  autorNome: string
  createdAt: string
  updatedAt: string | null
}

export interface LeituraNoticiaDto {
  empresaId: string
  empresaNome: string
  lida: boolean
  primeiraLeituraEm: string | null
  leitores: number
}

/* ---------- Certidões ---------- */

export type TipoCertidaoDto = 'FederalPgfn' | 'Estadual' | 'Municipal' | 'Fgts' | 'Trabalhista'
export type SituacaoCertidaoDto = 'Negativa' | 'PositivaComEfeitoNegativa' | 'Positiva'
export type ValidadeCertidaoDto = 'Vigente' | 'AVencer' | 'Vencida'

export interface CertidaoDto {
  id: string
  empresaId: string
  empresaNome: string
  tipo: TipoCertidaoDto
  tipoNome: string
  situacao: SituacaoCertidaoDto
  numero: string | null
  emissao: string
  validade: string
  statusValidade: ValidadeCertidaoDto
  diasParaVencer: number
  regular: boolean
  atual: boolean
  observacao: string | null
  possuiArquivo: boolean
  nomeArquivo: string | null
  tamanhoBytes: number | null
  cadastradoPorNome: string
  createdAt: string
  updatedAt: string | null
}

export interface PainelCertidoesDto {
  vencidas: number
  aVencer15Dias: number
  aVencer30Dias: number
  irregulares: number
  itens: CertidaoDto[]
}
