import { addDays, formatISO, setDate, startOfDay } from 'date-fns'
import type {
  Cnd,
  Company,
  DocumentFolder,
  DocumentItem,
  NewsItem,
  ServiceRequest,
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
  { id: 'rt-1', code: 'general', name: 'Solicitação Geral', group: 'service', description: 'Peça qualquer serviço ao escritório.' },
  { id: 'rt-2', code: 'employee', name: 'Cadastro de Empregado', group: 'service', description: 'Envie os dados de admissão de um novo empregado.' },
  { id: 'rt-3', code: 'taxpayer', name: 'Cadastro de Contribuinte', group: 'service', description: 'Cadastre pró-labore ou autônomo.' },
  { id: 'rt-4', code: 'intern', name: 'Cadastro de Estagiário', group: 'service', description: 'Envie os dados do contrato de estágio.' },
  { id: 'rt-5', code: 'vacation-notice', name: 'Aviso Prévio de Férias', group: 'service', description: 'Programe as férias de um empregado.' },
  { id: 'rt-6', code: 'vacation-calc', name: 'Cálculo de Férias', group: 'service', description: 'Solicite o cálculo de férias.' },
  { id: 'rt-7', code: 'termination-notice', name: 'Aviso Prévio de Rescisão', group: 'service', description: 'Comunique o desligamento de um empregado.' },
  { id: 'rt-8', code: 'termination-calc', name: 'Cálculo de Rescisão', group: 'service', description: 'Solicite o cálculo das verbas rescisórias.' },
  { id: 'rt-9', code: 'leave', name: 'Afastamento de Empregado', group: 'service', description: 'Informe atestados e afastamentos.' },
  { id: 'rt-10', code: 'payroll-items', name: 'Lançamento de Rubricas', group: 'service', description: 'Informe horas extras, faltas e comissões do mês.' },
  { id: 'rt-11', code: 'nfe', name: 'Manifestação de NF-e', group: 'nfe', description: 'Confirme ou desconheça notas emitidas contra seu CNPJ.' },
]

export const mockRequests: ServiceRequest[] = [
  {
    id: 'sr-1',
    number: 1042,
    typeName: 'Cálculo de Férias',
    subject: 'Férias de João Pereira (dezembro)',
    department: 'Pessoal',
    status: 'InAnalysis',
    createdAt: d(-2),
    updatedAt: d(-1),
  },
  {
    id: 'sr-2',
    number: 1038,
    typeName: 'Solicitação Geral',
    subject: 'Segunda via do contrato social',
    department: 'Societário',
    status: 'WaitingClient',
    createdAt: d(-7),
    updatedAt: d(-4),
  },
  {
    id: 'sr-3',
    number: 1021,
    typeName: 'Cadastro de Empregado',
    subject: 'Admissão de Ana Martins',
    department: 'Pessoal',
    status: 'Done',
    createdAt: d(-20),
    updatedAt: d(-15),
  },
]
