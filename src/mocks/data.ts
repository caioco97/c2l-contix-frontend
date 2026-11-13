import { addDays, formatISO, setDate, startOfDay } from 'date-fns'
import type {
  Employee,
  Cnd,
  Company,
  DocumentFolder,
  DocumentItem,
  NewsDetail,
  ServiceRequestDetail,
  ServiceRequestType,
  TaskDetail,
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
    competence: '2026-10-01',
    origin: 'office',
    recipientViews: 0,
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
    competence: '2026-10-01',
    origin: 'office',
    recipientViews: 1,
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
    competence: '2026-10-01',
    origin: 'office',
    recipientViews: 1,
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
    competence: '2026-10-01',
    origin: 'office',
    recipientViews: 0,
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
    competence: '2026-10-01',
    origin: 'office',
    recipientViews: 0,
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
    competence: null,
    origin: 'office',
    recipientViews: 1,
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
    competence: '2026-09-01',
    origin: 'office',
    recipientViews: 1,
  },
  {
    id: 'doc-8',
    folderId: 'f-fin',
    folderPath: 'Financeiro',
    name: 'Extratos bancários 10_2026.pdf',
    comment: 'Enviado pela empresa para conciliação',
    publishedAt: d(-1),
    dueDate: null,
    addedBy: 'Ana Souza',
    modifiedAt: d(-1),
    sizeBytes: 98_200,
    isRead: true,
    competence: '2026-10-01',
    origin: 'client',
    recipientViews: 1,
  },
]

const ymd = (offset: number) => formatISO(addDays(today, offset), { representation: 'date' })

export const mockNews: NewsDetail[] = [
  {
    id: 'n-1',
    title: 'Prazo da DCTFWeb de outubro',
    summary: 'A guia vence dia 20. Confira na pasta Pessoal/DARF DCTFWeb e evite multa por atraso.',
    content:
      'A guia da DCTFWeb de outubro vence no dia 20.\n\nEla já está disponível na pasta Pessoal/DARF DCTFWeb. ' +
      'Pagamentos após o vencimento têm multa de 0,33% ao dia, limitada a 20%, mais juros Selic.',
    publishedAt: d(-1),
    isRead: false,
    hasImage: false,
    attachmentCount: 0,
    attachments: [],
  },
  {
    id: 'n-2',
    title: 'Reforma tributária: o que muda em 2027',
    summary: 'Preparamos um resumo sobre CBS e IBS e os primeiros impactos para empresas do Simples Nacional.',
    content:
      'A partir de 2027 começa a transição para a CBS e o IBS.\n\nPreparamos um resumo com os principais pontos de ' +
      'atenção para empresas do Simples Nacional. Em breve entraremos em contato para agendar uma conversa.',
    publishedAt: d(-5),
    isRead: false,
    hasImage: false,
    attachmentCount: 1,
    attachments: [{ id: 'na-1', fileName: 'Resumo reforma tributária.pdf', sizeBytes: 182_000 }],
  },
  {
    id: 'n-3',
    title: 'Horário de atendimento no feriado',
    summary: 'No dia 20/11 o escritório funcionará em regime de plantão, das 9h às 13h.',
    content: 'No dia 20/11 o escritório funcionará em regime de plantão, das 9h às 13h.',
    publishedAt: d(-12),
    isRead: true,
    hasImage: false,
    attachmentCount: 0,
    attachments: [],
  },
]

const cnd = (
  id: string,
  type: Cnd['type'],
  typeName: string,
  situation: Cnd['situation'],
  issued: number,
  valid: number,
): Cnd => ({
  id,
  companyId: 'c-1',
  companyName: 'Empresa Demo',
  type,
  typeName,
  situation,
  number: null,
  issuedAt: ymd(issued),
  validUntil: ymd(valid),
  daysToExpire: valid,
  status: valid < 0 ? 'Expired' : situation === 'Positiva' ? 'Irregular' : valid <= 30 ? 'Expiring' : 'Regular',
  isCurrent: true,
  notes: null,
  hasFile: true,
  fileName: `${typeName}.pdf`,
  sizeBytes: 95_000,
  autoIssued: false,
})

export const mockCnds: Cnd[] = [
  cnd('cnd-1', 'FederalPgfn', 'Federal (RFB/PGFN)', 'Negativa', -60, 120),
  cnd('cnd-2', 'Fgts', 'FGTS (CRF)', 'Negativa', -25, 5),
  cnd('cnd-3', 'Estadual', 'Estadual', 'PositivaComEfeitoNegativa', -20, 70),
  cnd('cnd-4', 'Trabalhista', 'Trabalhista (CNDT)', 'Negativa', -200, -20),
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
    employeeId: null,
    employeeName: null,
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
    employeeId: 'e-2', employeeName: 'João Pereira',
    data: { empregadoId: 'e-2', empregado: 'João Pereira', periodoAquisitivoInicio: '2025-01-02', periodoAquisitivoFim: '2026-01-01', dataInicio: '2026-12-01', dias: 30, abonoPecuniario: false, adiantamento13: true },
  }),
  mockRequest({
    id: 'sr-2', number: 2, typeCode: 'Geral', subject: 'Segunda via do contrato social', department: 'Societario',
    status: 'WaitingClient', daysAgo: 7, description: 'Precisamos da segunda via para o banco.',
  }),
  mockRequest({
    id: 'sr-3', number: 1, typeCode: 'CadastroEmpregado', subject: 'Cadastro de Empregado - Ana Martins', department: 'Pessoal',
    status: 'Done', daysAgo: 20, employeeId: 'e-3', employeeName: 'Ana Martins',
  }),
]

export const mockEmployeeList: Employee[] = [
  { id: 'e-1', companyId: 'c-1', name: 'Maria Souza', cpf: '52998224725', registration: '0001', role: 'Analista financeira', bond: 'Empregado', status: 'Ativo', admissionDate: '2024-11-01', terminationDate: null, email: null, phone: null, originRequestId: null, createdAt: '2024-11-01T12:00:00Z' },
  { id: 'e-2', companyId: 'c-1', name: 'João Pereira', cpf: '11144477735', registration: '0002', role: 'Vendedor', bond: 'Empregado', status: 'Ativo', admissionDate: '2025-08-01', terminationDate: null, email: null, phone: null, originRequestId: null, createdAt: '2025-08-01T12:00:00Z' },
  { id: 'e-3', companyId: 'c-1', name: 'Ana Martins', cpf: '39053344705', registration: '0003', role: 'Assistente administrativa', bond: 'Empregado', status: 'Ativo', admissionDate: '2026-07-01', terminationDate: null, email: null, phone: null, originRequestId: 'sr-3', createdAt: '2026-07-01T12:00:00Z' },
  { id: 'e-4', companyId: 'c-1', name: 'Carlos Lima', cpf: '15350946056', registration: '0004', role: 'Sócio-administrador', bond: 'Contribuinte', status: 'Ativo', admissionDate: '2021-01-04', terminationDate: null, email: null, phone: null, originRequestId: null, createdAt: '2021-01-04T12:00:00Z' },
  { id: 'e-5', companyId: 'c-1', name: 'Paulo Ramos', cpf: null, registration: null, role: 'Auxiliar', bond: 'Empregado', status: 'Desligado', admissionDate: '2023-02-01', terminationDate: '2026-06-30', email: null, phone: null, originRequestId: null, createdAt: '2023-02-01T12:00:00Z' },
]

/** Tarefas de demonstração da primeira empresa, com prazos relativos a hoje. */
export function mockTasks(): TaskDetail[] {
  const day = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10)
  const at = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString()
  const base = {
    companyId: 'c-1',
    companyName: 'Padaria Bom Grão',
    assigneeId: 'u-1',
    assigneeName: 'Mariana Souza',
    createdByName: 'Mariana Souza',
    completedAt: null,
    attachments: 0,
  }
  const created = (id: string, offset: number, message: string | null): TaskDetail['history'][number] => ({
    id: `${id}-e1`,
    kind: 'created',
    message,
    fromStatus: null,
    toStatus: 'Pending',
    authorName: 'Mariana Souza',
    createdAt: at(offset),
    attachments: [],
  })
  return [
    {
      ...base,
      id: 't-1',
      number: 3,
      title: 'Apuração do ICMS 10/2026',
      description: 'Conferir as notas de entrada e saída antes de gerar a guia.',
      department: 'Fiscal',
      status: 'InProgress',
      internalDueDate: day(-1),
      legalDueDate: day(3),
      isOverdue: true,
      isLegalOverdue: false,
      comments: 1,
      createdAt: at(-6),
      updatedAt: at(-1),
      allowedTransitions: ['Pending', 'Done', 'Canceled'],
      history: [
        created('t-1', -6, 'Conferir as notas de entrada e saída antes de gerar a guia.'),
        { id: 't-1-e2', kind: 'status', message: null, fromStatus: 'Pending', toStatus: 'InProgress', authorName: 'Mariana Souza', createdAt: at(-2), attachments: [] },
        { id: 't-1-e3', kind: 'comment', message: 'Faltam os XML de duas notas de entrada. Pedi ao cliente.', fromStatus: null, toStatus: null, authorName: 'Mariana Souza', createdAt: at(-1), attachments: [] },
      ],
    },
    {
      ...base,
      id: 't-2',
      number: 2,
      title: 'Fechamento da folha de novembro',
      description: null,
      department: 'Pessoal',
      status: 'Pending',
      internalDueDate: day(4),
      legalDueDate: day(7),
      isOverdue: false,
      isLegalOverdue: false,
      comments: 0,
      createdAt: at(-3),
      updatedAt: at(-3),
      allowedTransitions: ['InProgress', 'Done', 'Canceled'],
      history: [created('t-2', -3, null)],
    },
    {
      ...base,
      id: 't-3',
      number: 1,
      title: 'Balancete do 3º trimestre',
      description: 'Enviar ao cliente depois da revisão.',
      department: 'Contabil',
      status: 'Done',
      internalDueDate: day(-10),
      legalDueDate: null,
      isOverdue: false,
      isLegalOverdue: false,
      comments: 0,
      completedAt: at(-9),
      createdAt: at(-15),
      updatedAt: at(-9),
      allowedTransitions: ['InProgress'],
      history: [
        created('t-3', -15, 'Enviar ao cliente depois da revisão.'),
        { id: 't-3-e2', kind: 'status', message: 'Revisado e enviado.', fromStatus: 'Pending', toStatus: 'Done', authorName: 'Mariana Souza', createdAt: at(-9), attachments: [] },
      ],
    },
  ]
}
