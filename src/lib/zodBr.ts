import { z } from 'zod'
import { isValidCep, isValidCnpj, isValidCpf, isValidCpfOrCnpj, isValidIe, isValidMobile, isValidPhone, isValidPis, isValidUf } from './br'

/** Campo obrigatório validado por `check`. */
const required = (check: (v: string) => boolean, empty: string, invalid: string) =>
  z.string().trim().min(1, empty).refine(check, invalid)

/** Campo opcional: vazio passa, preenchido precisa ser válido. */
const optional = (check: (v: string) => boolean, invalid: string) =>
  z.string().refine((v) => !v.trim() || check(v), invalid)

/** Schemas Zod para os campos brasileiros. Os valores chegam com máscara. */
export const br = {
  cpf: () => required(isValidCpf, 'Informe o CPF.', 'CPF inválido.'),
  cnpj: () => required(isValidCnpj, 'Informe o CNPJ.', 'CNPJ inválido.'),
  cpfOuCnpj: () => required(isValidCpfOrCnpj, 'Informe o CNPJ ou CPF.', 'CNPJ ou CPF inválido.'),
  pis: () => optional(isValidPis, 'PIS inválido.'),
  cep: () => optional(isValidCep, 'CEP inválido.'),
  celular: () => optional(isValidMobile, 'Celular inválido. Use DDD + 9 dígitos.'),
  telefone: () => optional(isValidPhone, 'Telefone inválido.'),
  ie: () => optional(isValidIe, 'Inscrição estadual inválida. Use só números ou ISENTO.'),
  im: () => z.string().max(15, 'Máximo de 15 dígitos.'),
  uf: () => optional(isValidUf, 'Selecione a UF.'),
}
