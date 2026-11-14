import { useEffect, useState } from 'react'

/** Valor que só muda depois de `ms` sem alterações (buscas enquanto o usuário digita). */
export function useDebounced<T>(value: T, ms = 300) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}
