import { z } from 'zod'
import type { Department, ServiceRequestType, ServiceRequestTypeCode } from '@/types/domain'

/** Valores do formulário de nova solicitação. Os campos de `data` usam os nomes da API. */
export interface RubricaRow {
  empregado: string
  rubrica: string
  quantidade: string
  valor: string
}

export interface RequestData {
  // Cadastros
  nome: string
  cpf: string
  rg: string
  pis: string
  dataNascimento: string
  email: string
  telefone: string
  endereco: { cep: string; logradouro: string; numero: string; complemento: string; bairro: string; cidade: string; uf: string }
  cargo: string
  salario: string
  jornada: string
  dataAdmissao: string
  instituicaoEnsino: string
  curso: string
  dataTerminoEstagio: string
  // Férias / rescisão / afastamento
  empregado: string
  periodoAquisitivoInicio: string
  periodoAquisitivoFim: string
  dataInicio: string
  dias: string
  abonoPecuniario: boolean
  adiantamento13: boolean
  tipoDesligamento: string
  dataDesligamento: string
  avisoPrevio: string
  motivo: string
  previsaoRetorno: string
  observacoes: string
  // Rubricas
  competencia: string
  lancamentos: RubricaRow[]
}

export interface RequestFormValues {
  subject: string
  department: Department | ''
  description: string
  attachments: File[]
  data: RequestData
}

export const emptyRubrica = (): RubricaRow => ({ empregado: '', rubrica: '', quantidade: '', valor: '' })

export function defaultValues(type: ServiceRequestType | undefined): RequestFormValues {
  return {
    subject: '',
    department: type?.code === 'Geral' ? '' : (type?.department ?? ''),
    description: '',
    attachments: [],
    data: {
      nome: '', cpf: '', rg: '', pis: '', dataNascimento: '', email: '', telefone: '',
      endereco: { cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '' },
      cargo: '', salario: '', jornada: '', dataAdmissao: '', instituicaoEnsino: '', curso: '', dataTerminoEstagio: '',
      empregado: '', periodoAquisitivoInicio: '', periodoAquisitivoFim: '', dataInicio: '', dias: '30',
      abonoPecuniario: false, adiantamento13: false, tipoDesligamento: '', dataDesligamento: '', avisoPrevio: '',
      motivo: '', previsaoRetorno: '', observacoes: '', competencia: '', lancamentos: [emptyRubrica()],
    },
  }
}

/* ---------- Validação (espelha a da API, para dar retorno imediato) ---------- */

export function cpfValido(valor: string) {
  const d = valor.replace(/\D/g, '')
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false
  const digito = (n: number) => {
    let soma = 0
    for (let i = 0; i < n; i++) soma += Number(d[i]) * (n + 1 - i)
    const resto = (soma * 10) % 11
    return resto === 10 ? 0 : resto
  }
  return digito(9) === Number(d[9]) && digito(10) === Number(d[10])
}

const req = (msg = 'Campo obrigatório.') => z.string().trim().min(1, msg)
const opt = z.string()
const positivo = (msg: string) =>
  req(msg).refine((v) => Number(v.replace(',', '.')) > 0, 'Informe um valor maior que zero.')

function pessoa(code: ServiceRequestTypeCode) {
  const estagio = code === 'CadastroEstagiario'
  return z
    .object({
      nome: req('Informe o nome.'),
      cpf: req('Informe o CPF.').refine(cpfValido, 'CPF inválido.'),
      dataNascimento: req('Informe a data de nascimento.'),
      email: z.union([z.literal(''), z.email('E-mail inválido.')]),
      cargo: req(code === 'CadastroContribuinte' ? 'Informe a função.' : 'Informe o cargo.'),
      salario: positivo('Informe o valor.'),
      jornada: code === 'CadastroContribuinte' ? opt : req('Informe a jornada.'),
      dataAdmissao: req('Informe a data.'),
      instituicaoEnsino: estagio ? req('Informe a instituição.') : opt,
      curso: estagio ? req('Informe o curso.') : opt,
      dataTerminoEstagio: estagio ? req('Informe o término.') : opt,
    })
    .refine((d) => !estagio || !d.dataAdmissao || d.dataTerminoEstagio > d.dataAdmissao, {
      path: ['dataTerminoEstagio'],
      message: 'O término deve ser posterior ao início.',
    })
}

const ferias = z
  .object({
    empregado: req('Informe o empregado.'),
    periodoAquisitivoInicio: req('Informe o início.'),
    periodoAquisitivoFim: req('Informe o fim.'),
    dataInicio: req('Informe o início das férias.'),
    dias: req('Informe os dias.'),
    abonoPecuniario: z.boolean(),
  })
  .refine((d) => !d.periodoAquisitivoInicio || d.periodoAquisitivoFim > d.periodoAquisitivoInicio, {
    path: ['periodoAquisitivoFim'],
    message: 'O fim deve ser após o início.',
  })
  .refine((d) => Number(d.dias) >= 5 && Number(d.dias) <= 30, { path: ['dias'], message: 'Entre 5 e 30 dias.' })
  .refine((d) => !d.abonoPecuniario || Number(d.dias) <= 20, {
    path: ['dias'],
    message: 'Com abono pecuniário, no máximo 20 dias de gozo.',
  })

const rescisao = z.object({
  empregado: req('Informe o empregado.'),
  tipoDesligamento: req('Selecione o tipo.'),
  dataDesligamento: req('Informe a data.'),
  avisoPrevio: req('Selecione o aviso prévio.'),
})

const afastamento = z
  .object({ empregado: req('Informe o empregado.'), motivo: req('Selecione o motivo.'), dataInicio: req('Informe o início.'), previsaoRetorno: opt })
  .refine((d) => !d.previsaoRetorno || d.previsaoRetorno >= d.dataInicio, {
    path: ['previsaoRetorno'],
    message: 'Deve ser igual ou posterior ao início.',
  })

const rubricas = z.object({
  competencia: req('Informe a competência.'),
  lancamentos: z
    .array(
      z
        .object({ empregado: req('Informe o empregado.'), rubrica: req('Informe a rubrica.'), quantidade: opt, valor: opt })
        .refine((l) => Number(l.quantidade.replace(',', '.')) > 0 || Number(l.valor.replace(',', '.')) > 0, {
          path: ['valor'],
          message: 'Informe a quantidade ou o valor.',
        }),
    )
    .min(1, 'Informe ao menos um lançamento.'),
})

function dataSchema(code: ServiceRequestTypeCode) {
  switch (code) {
    case 'CadastroEmpregado':
    case 'CadastroContribuinte':
    case 'CadastroEstagiario':
      return pessoa(code)
    case 'AvisoFerias':
    case 'CalculoFerias':
      return ferias
    case 'AvisoRescisao':
    case 'CalculoRescisao':
      return rescisao
    case 'Afastamento':
      return afastamento
    case 'LancamentoRubricas':
      return rubricas
    default:
      return z.object({})
  }
}

export function buildSchema(type: ServiceRequestType) {
  const geral = type.code === 'Geral'
  return z
    .object({
      subject: geral ? req('Informe o assunto.').max(200) : opt,
      department: geral ? req('Escolha o departamento.') : opt,
      description: geral ? req('Descreva o pedido.').max(5000) : z.string().max(5000),
      attachments: z.array(z.instanceof(File)).max(20, 'Máximo de 20 anexos.'),
      data: dataSchema(type.code),
    })
    .refine((v) => !type.requiresAttachment || v.attachments.length > 0, {
      path: ['attachments'],
      message: type.attachmentHint ?? 'Anexe ao menos um arquivo.',
    })
}

/* ---------- Conversão para o formato da API ---------- */

const num = (v: string | undefined) => (v?.trim() ? Number(v.replace(',', '.')) : undefined)
const txt = (v: string | undefined) => v?.trim() || undefined

export function toApiData(code: ServiceRequestTypeCode, d: RequestData): Record<string, unknown> | undefined {
  switch (code) {
    case 'CadastroEmpregado':
    case 'CadastroContribuinte':
    case 'CadastroEstagiario': {
      const e = d.endereco
      const temEndereco = Object.values(e).some((v) => v.trim())
      return {
        nome: d.nome.trim(), cpf: d.cpf, rg: txt(d.rg), pis: txt(d.pis), dataNascimento: d.dataNascimento,
        email: txt(d.email), telefone: txt(d.telefone),
        endereco: temEndereco ? Object.fromEntries(Object.entries(e).map(([k, v]) => [k, txt(v)])) : undefined,
        cargo: txt(d.cargo), salario: num(d.salario), jornada: txt(d.jornada), dataAdmissao: txt(d.dataAdmissao),
        instituicaoEnsino: txt(d.instituicaoEnsino), curso: txt(d.curso), dataTerminoEstagio: txt(d.dataTerminoEstagio),
      }
    }
    case 'AvisoFerias':
    case 'CalculoFerias':
      return {
        empregado: d.empregado.trim(), periodoAquisitivoInicio: d.periodoAquisitivoInicio,
        periodoAquisitivoFim: d.periodoAquisitivoFim, dataInicio: d.dataInicio, dias: Number(d.dias),
        abonoPecuniario: d.abonoPecuniario, adiantamento13: d.adiantamento13,
      }
    case 'AvisoRescisao':
    case 'CalculoRescisao':
      return {
        empregado: d.empregado.trim(), tipoDesligamento: d.tipoDesligamento, dataDesligamento: d.dataDesligamento,
        avisoPrevio: d.avisoPrevio, observacoes: txt(d.observacoes),
      }
    case 'Afastamento':
      return {
        empregado: d.empregado.trim(), motivo: d.motivo, dataInicio: d.dataInicio,
        previsaoRetorno: txt(d.previsaoRetorno), observacoes: txt(d.observacoes),
      }
    case 'LancamentoRubricas':
      return {
        competencia: `${d.competencia}-01`,
        lancamentos: d.lancamentos.map((l) => ({
          empregado: l.empregado.trim(), rubrica: l.rubrica.trim(), quantidade: num(l.quantidade), valor: num(l.valor),
        })),
      }
    default:
      return undefined
  }
}

/** Converte a chave de erro da API (ex.: "dados.lancamentos[0].valor") para o caminho do formulário. */
export function apiErrorPath(key: string): string {
  const base: Record<string, string> = { assunto: 'subject', departamento: 'department', descricao: 'description', anexos: 'attachments' }
  if (base[key]) return base[key]
  return key.replace(/^dados\./, 'data.').replace(/\[(\d+)\]/g, '.$1')
}
