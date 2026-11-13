import { useCallback, useEffect, useRef, useState } from 'react'
import { digits } from './br'

export interface CepAddress {
  street: string
  district: string
  city: string
  state: string
}

const TIMEOUT_MS = 5000

async function getJson(url: string): Promise<unknown> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: 'application/json' } })
    if (res.status === 404 || res.status === 400) return null
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } finally {
    clearTimeout(timer)
  }
}

interface ViaCep { erro?: boolean | string; logradouro?: string; bairro?: string; localidade?: string; uf?: string }
interface BrasilApiCep { street?: string; neighborhood?: string; city?: string; state?: string }

async function viaCep(cep: string): Promise<CepAddress | null> {
  const r = (await getJson(`https://viacep.com.br/ws/${cep}/json/`)) as ViaCep | null
  if (!r || r.erro) return null
  return { street: r.logradouro ?? '', district: r.bairro ?? '', city: r.localidade ?? '', state: r.uf ?? '' }
}

async function brasilApi(cep: string): Promise<CepAddress | null> {
  const r = (await getJson(`https://brasilapi.com.br/api/cep/v1/${cep}`)) as BrasilApiCep | null
  if (!r) return null
  return { street: r.street ?? '', district: r.neighborhood ?? '', city: r.city ?? '', state: r.state ?? '' }
}

/**
 * Busca o endereço do CEP no ViaCEP e, se ele falhar ou não achar, na BrasilAPI
 * (que consulta Correios e outras bases). Devolve null quando nenhum encontra.
 */
export async function lookupCep(value: string): Promise<CepAddress | null> {
  const cep = digits(value)
  if (cep.length !== 8) return null
  let failed = false
  for (const source of [viaCep, brasilApi]) {
    try {
      const found = await source(cep)
      if (found) return found
    } catch {
      failed = true
    }
  }
  if (failed) throw new Error('CEP lookup unavailable')
  return null
}

export type CepStatus = 'idle' | 'loading' | 'found' | 'notFound' | 'error'

export const CEP_HINTS: Partial<Record<CepStatus, string>> = {
  loading: 'Buscando endereço...',
  found: 'Endereço preenchido pelo CEP. Confira e complete o número.',
  notFound: 'CEP não encontrado. Preencha o endereço manualmente.',
  error: 'Não foi possível consultar o CEP agora. Preencha o endereço manualmente.',
}

/**
 * Chame `lookup` no onChange do campo CEP. Quando o CEP fica completo, busca o
 * endereço e chama `onFound`. Não busca no carregamento do formulário.
 */
export function useCepLookup(onFound: (a: CepAddress) => void) {
  const [status, setStatus] = useState<CepStatus>('idle')
  const last = useRef('')
  const cb = useRef(onFound)
  useEffect(() => {
    cb.current = onFound
  })

  const lookup = useCallback(async (value: string) => {
    const cep = digits(value)
    if (cep.length !== 8) {
      last.current = ''
      setStatus('idle')
      return
    }
    if (cep === last.current) return
    last.current = cep
    setStatus('loading')
    try {
      const found = await lookupCep(cep)
      if (last.current !== cep) return
      if (found) cb.current(found)
      setStatus(found ? 'found' : 'notFound')
    } catch {
      if (last.current === cep) setStatus('error')
    }
  }, [])

  return { status, hint: CEP_HINTS[status], lookup }
}
