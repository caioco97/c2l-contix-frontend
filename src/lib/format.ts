import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function formatDate(iso: string | null | undefined, pattern = 'dd/MM/yyyy') {
  if (!iso) return '—'
  return format(parseISO(iso), pattern, { locale: ptBR })
}

export function formatDateTime(iso: string | null | undefined) {
  return formatDate(iso, "dd/MM/yyyy 'às' HH:mm")
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
