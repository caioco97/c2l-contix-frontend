import { useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'

/** Object URL de um arquivo/blob, liberada quando ele muda ou o componente desmonta. */
export function useObjectUrl(blob: Blob | null | undefined) {
  const url = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob])
  useEffect(() => () => {
    if (url) URL.revokeObjectURL(url)
  }, [url])
  return url
}

/** Carrega um arquivo protegido (ex.: imagem que exige o token) e devolve uma object URL. */
export function useBlobUrl(key: readonly unknown[], fetcher: () => Promise<Blob>, enabled: boolean) {
  const { data } = useQuery({ queryKey: key, queryFn: fetcher, enabled, staleTime: 10 * 60_000 })
  const url = useObjectUrl(enabled ? data : null)
  return url
}
