import type { BadgeTone } from '@/components/ui'
import type { NfeManifestation, NfeStatus } from './types'

export const MANIFESTATIONS: { value: Exclude<NfeManifestation, 'SemManifestacao'>; label: string; description: string; final: boolean }[] = [
  {
    value: 'Ciencia',
    label: 'Ciência da operação',
    description: 'Você sabe da nota, mas ainda não conferiu. Libera o XML completo e permite outra manifestação depois.',
    final: false,
  },
  { value: 'Confirmada', label: 'Confirmação da operação', description: 'A compra aconteceu e a mercadoria ou serviço foi recebido.', final: true },
  { value: 'Desconhecida', label: 'Desconhecimento da operação', description: 'A empresa não reconhece esta compra (possível uso indevido do CNPJ).', final: true },
  { value: 'NaoRealizada', label: 'Operação não realizada', description: 'A compra foi combinada mas não se concretizou (devolução, recusa etc.).', final: true },
]

export const manifestationLabel: Record<NfeManifestation, string> = {
  SemManifestacao: 'Pendente',
  Ciencia: 'Ciência',
  Confirmada: 'Confirmada',
  Desconhecida: 'Desconhecida',
  NaoRealizada: 'Não realizada',
}

export const manifestationTone: Record<NfeManifestation, BadgeTone> = {
  SemManifestacao: 'warning',
  Ciencia: 'info',
  Confirmada: 'success',
  Desconhecida: 'danger',
  NaoRealizada: 'neutral',
}

export const statusTone: Record<NfeStatus, BadgeTone> = { Autorizada: 'success', Denegada: 'danger', Cancelada: 'danger' }

export const isFinal = (m: NfeManifestation) => m === 'Confirmada' || m === 'Desconhecida' || m === 'NaoRealizada'

export const money = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

/** Chave de acesso em blocos de 4 dígitos, como no DANFE. */
export const formatAccessKey = (k: string) => k.replace(/(\d{4})(?=\d)/g, '$1 ')
