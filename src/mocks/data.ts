import { addDays, formatISO, setDate, startOfDay } from 'date-fns'
import type {
  Cnd,
  Company,
  DocumentFolder,
  DocumentItem,
  NewsItem,
  ServiceRequestDetail,
  ServiceRequestType,
} from '@/types/domain'
import type { CurrentUser } from '@/types/auth'

/** Datas relativas a hoje para que os mocks sempre pareçam atuais. */
const today = startOfDay(new Date())
const d = (offset: number) => formatISO(addDays(today, offset))
const dayOfMonth = (day: number) => formatISO(setDate(today, day))

export const mockUser: CurrentUser = {
  id: 'u-1',
  name: 'Mariana Souza',
  email: 'demo@contix.com.br',
  role: 'Client',
  office: { id: 'o-1', name: 'Exemplo Contabilidade', logoUrl: null },
}

export const mockCompanies: Company[] = [
  {
    id: 'c-1',
    legalName: 'Bom Grão Alimentos LTDA',
    tradeName: 'Padaria Bom Grão',
    nickname: 'BOMGRAO',
    document: '12345678000190',
  },
  {
    id: 'c-2',
    legalName: 'Nova Rota Transportes EIRELI',
    tradeName: 'Nova Rota',
    nickname: 'NOVAROTA',
    document: '98765432000110',
  },
]

export const mockFolders: DocumentFolder[] = [
  { id: 'f-adm', name: 'Administrativo', parentId: null, unreadCount: 1 },
  { id: 'f-cont', name: 'Contabilidade', parentId: null, unreadCount: 0 },
  { id: 'f-fin', name: 'Financeiro', parentId: null, unreadCount: 0 },
  { id: 'f-fis', name: 'Fiscal', parentId: null, unreadCount: 2 },
  { id: 'f-pat', name: 'Patrimônio', parentId: null, unreadCount: 0 },
  {
    id: 'f-pes',
    name: 'Pessoal',
    parentId: null,
    unreadCount: 2,
    children: [
      { id: 'f-pes-darf', name: 'DARF DCTFWeb', parentId: 'f-pes', unreadCount: 1 },
      { id: 'f-pes-folha', name: 'Folha de Pagamento', parentId: 'f-pes', unreadCount: 1 },
      { id: 'f-pes-fgts', name: 'FGTS', parentId: 'f-pes', unreadCount: 0 },
    ],
  },
  { id: 'f-reg', name: 'Registro de Empresas', parentId: null, unreadCount: 0 },
]

export const mockDocuments: DocumentItem[] = [
  {
    id: 'doc-1',
    folderId: 'f-pes-darf',
    folderPath: 'Pessoal/DARF DCTFWeb',
    name: 'Guia DARF DCTFWeb 10_2026.pdf',
    comment: 'Competência outubro/2026',
    publishedAt: d(-3),
    dueDate: dayOfMonth(20),
    addedBy: 'Carlos Lima',
    modifiedAt: d(-3),
    sizeBytes: 182_400,
    isRead: false,
  },
  {
    id: 'doc-2',
    folderId: 'f-fis',
    folderPath: 'Fiscal',
    name: 'DAS Simples Nacional 10_2026.pdf',
    comment: null,
    publishedAt: d(-2),
    dueDate: dayOfMonth(20),
    addedBy: 'Fernanda Alves',
    modifiedAt: d(-2),
    sizeBytes: 96_200,
    isRead: false,
  },
  {
    id: 'doc-3',
    folderId: 'f-fis',
    folderPath: 'Fiscal',
    name: 'Livro de Apuração ICMS 10_2026.pdf',
    comment: 'Para conferência',
    publishedAt: d(-6),
    dueDate: null,
    addedBy: 'Fernanda Alves',
    modifiedAt: d(-6),
    sizeBytes: 412_000,
    isRead: false,
  },
  {
    id: 'doc-4',
    folderId: 'f-pes-folha',
    folderPath: 'Pessoal/Folha de Pagamento',
    name: 'Holerites 10_2026.pdf',
    comment: null,
    publishedAt: d(-8),
    dueDate: dayOfMonth(5),
    addedBy: 'Carlos Lima',
    modifiedAt: d(-8),
    sizeBytes: 755_000,
    isRead: false,
  },
  {
    id: 'doc-5',
    folderId: 'f-pes-fgts',
    folderPath: 'Pessoal/FGTS',
    name: 'Guia FGTS Digital 10_2026.pdf',
    comment: null,
    publishedAt: d(-9),
    dueDate: dayOfMonth(7),
    addedBy: 'Carlos Lima',
    modifiedAt: d(-9),
    sizeBytes: 88_100,
    isRead: true,
  },
  {
    id: 'doc-6',
    folderId: 'f-adm',
    folderPath: 'Administrativo',
    name: 'Contrato de prestação de serviços contábeis.pdf',
    comment: 'Versão assinada',
    publishedAt: d(-40),
    dueDate: null,
    addedBy: 'Roberta Nunes',
    modifiedAt: d(-1),
    sizeBytes: 1_240_000,
    isRead: false,
  },
  {
    id: 'doc-7',
    folderId: 'f-cont',
    folderPath: 'Contabilidade',
    name: 'Balancete 09_2026.pdf',
    comment: null,
    publishedAt: d(-30),
    dueDate: null,
    addedBy: 'Roberta Nunes',
    modifiedAt: d(-30),
    sizeBytes: 320_500,
    isRead: true,
  },
]

export const mockNews: NewsItem[] = [
  {
    id: 'n-1',
    title: 'Prazo da DCTFWeb de outubro',
    summary: 'A guia vence dia 20. Confira na pasta Pessoal/DARF DCTFWeb e evite multa por atraso.',
    publishedAt: d(-1),
    isRead: false,
  },
  {
    id: 'n-2',
    title: 'Reforma tributária: o que muda em 2027',
    summary: 'Preparamos um resumo sobre CBS e IBS e os primeiros impactos para empresas do Simples Nacional.',
    publishedAt: d(-5),
    isRead: false,
  },
  {
    id: 'n-3',
    title: 'Horário de atendimento no feriado',
    summary: 'No dia 20/11 o escritório funcionará em regime de plantão, das 9h às 13h.',
    publishedAt: d(-12),
    isRead: true,
  },
]

export const mockCnds: Cnd[] = [
  { id: 'cnd-1', type: 'Federal (RFB/PGFN)', status: 'Regular', issuedAt: d(-60), validUntil: d(120) },
  { id: 'cnd-2', type: 'FGTS', status: 'Expiring', issuedAt: d(-25), validUntil: d(5) },
  { id: 'cnd-3', type: 'Estadual', status: 'Regular', issuedAt: d(-20), validUntil: d(70) },
  { id: 'cnd-4', type: 'Trabalhista (CNDT)', status: 'Expired', issuedAt: d(-200), validUntil: d(-20) },
]

export const mockRequestTypes: ServiceRequestType[] = [
  { code: 'Geral', name: 'Solicitação Geral', description: 'Peça qualquer serviço ao escritório que não esteja no catálogo.', department: 'Contabil', deadlineDays: 5, requiresAttachment: false, attachmentHint: null },
  { code: 'CadastroEmpregado', name: 'Cadastro de Empregado', description: 'Envie os dados de admissão de um novo empregado.', department: 'Pessoal', deadlineDays: 3, requiresAttachment: true, attachmentHint: 'Anexe RG, CPF, CTPS, comprovante de residência e exame admissional.' },
  { code: 'CadastroContribuinte', name: 'Cadastro de Contribuinte', description: 'Cadastre sócios (pró-labore) ou autônomos para recolhimento.', department: 'Pessoal', deadlineDays: 3, requiresAttachment: true, attachmentHint: 'Anexe RG, CPF e comprovante de residência.' },
  { code: 'CadastroEstagiario', name: 'Cadastro de Estagiário', description: 'Envie os dados para o termo de compromisso de estágio.', department: 'Pessoal', deadlineDays: 3, requiresAttachment: true, attachmentHint: 'Anexe RG, CPF, comprovante de matrícula e termo de compromisso, se houver.' },
  { code: 'AvisoFerias', name: 'Aviso Prévio de Férias', description: 'Informe as férias de um empregado para emissão do aviso.', department: 'Pessoal', deadlineDays: 5, requiresAttachment: false, attachmentHint: null },
  { code: 'CalculoFerias', name: 'Cálculo de Férias', description: 'Solicite o cálculo e o recibo de férias de um empregado.', department: 'Pessoal', deadlineDays: 3, requiresAttachment: false, attachmentHint: null },
  { code: 'AvisoRescisao', name: 'Aviso Prévio de Rescisão', description: 'Informe o desligamento de um empregado para emissão do aviso prévio.', department: 'Pessoal', deadlineDays: 2, requiresAttachment: false, attachmentHint: null },
  { code: 'CalculoRescisao', name: 'Cálculo de Rescisão', description: 'Solicite o cálculo das verbas rescisórias de um empregado.', department: 'Pessoal', deadlineDays: 3, requiresAttachment: false, attachmentHint: null },
  { code: 'Afastamento', name: 'Afastamento de Empregado', description: 'Informe afastamentos por doença, acidente, licenças e outros.', department: 'Pessoal', deadlineDays: 2, requiresAttachment: true, attachmentHint: 'Anexe o atestado ou documento que comprove o afastamento.' },
  { code: 'LancamentoRubricas', name: 'Lançamento de Rubricas', description: 'Informe horas extras, faltas, comissões e outros eventos da folha.', department: 'Pessoal', deadlineDays: 5, requiresAttachment: false, attachmentHint: null },
]

function mockRequest(r: Pick<ServiceRequestDetail, 'id' | 'number' | 'typeCode' | 'subject' | 'department' | 'status'> &
  Partial<ServiceRequestDetail> & { daysAgo: number }): ServiceRequestDetail {
  const type = mockRequestTypes.find((t) => t.code === r.typeCode)!
  const createdAt = d(-r.daysAgo)
  return {
    companyId: 'c-1',
    companyName: 'Padaria Pão Quente',
    typeName: type.name,
    requesterName: 'Cliente Demo',
    assigneeId: null,
    assigneeName: null,
    dueDate: d(-r.daysAgo + type.deadlineDays).slice(0, 10),
    isOverdue: false,
    createdAt,
    updatedAt: createdAt,
    description: null,
    data: null,
    closedAt: null,
    allowedTransitions: r.status === 'Open' || r.status === 'WaitingClient' ? ['Canceled'] : [],
    history: [
      { id: `${r.id}-h1`, kind: 'opened', message: r.description ?? null, fromStatus: null, toStatus: 'Open', authorName: 'Cliente Demo', authorIsOffice: false, createdAt, attachments: [] },
    ],
    ...r,
  }
}

export const mockRequests: ServiceRequestDetail[] = [
  mockRequest({
    id: 'sr-1', number: 3, typeCode: 'CalculoFerias', subject: 'Cálculo de Férias - João Pereira', department: 'Pessoal',
    status: 'InAnalysis', daysAgo: 2, assigneeId: 'u-1', assigneeName: 'Carla Mendes',
    data: { empregado: 'João Pereira', periodoAquisitivoInicio: '2025-01-02', periodoAquisitivoFim: '2026-01-01', dataInicio: '2026-12-01', dias: 30, abonoPecuniario: false, adiantamento13: true },
  }),
  mockRequest({
    id: 'sr-2', number: 2, typeCode: 'Geral', subject: 'Segunda via do contrato social', department: 'Societario',
    status: 'WaitingClient', daysAgo: 7, description: 'Precisamos da segunda via para o banco.',
  }),
  mockRequest({
    id: 'sr-3', number: 1, typeCode: 'CadastroEmpregado', subject: 'Cadastro de Empregado - Ana Martins', department: 'Pessoal',
    status: 'Done', daysAgo: 20,
  }),
]
