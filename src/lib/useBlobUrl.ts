import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'

/**
 * Object URL de um arquivo/blob, liberada quando ele muda ou o componente desmonta.
 * A URL nasce e morre no mesmo efeito: com useMemo, o StrictMode (montar, desmontar, montar)
 * revogava a URL memorizada e a imagem aparecia quebrada.
 */
export function useObjectUrl(blob: Blob | null | undefined) {
  const [entry, setEntry] = useState<{ blob: Blob; url: string } | null>(null)
  useEffect(() => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    // A object URL é um recurso externo: criada e liberada pelo próprio efeito.
    // oxlint-disable-next-line react/set-state-in-effect
    setEntry({ blob, url })
    return () => URL.revokeObjectURL(url)
  }, [blob])
  // Só devolve a URL do blob atual (nunca uma já revogada de um blob anterior).
  return blob && entry?.blob === blob ? entry.url : null
}

/** Carrega um arquivo protegido (ex.: imagem que exige o token) e devolve uma object URL. */
export function useBlobUrl(key: readonly unknown[], fetcher: () => Promise<Blob>, enabled: boolean) {
  const { data } = useQuery({ queryKey: key, queryFn: fetcher, enabled, staleTime: 10 * 60_000 })
  const url = useObjectUrl(enabled ? data : null)
  return url
}
