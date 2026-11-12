/** Envelope de paginação padrão da API (/api/v1). */
export interface PagedResult<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
  totalPages?: number
}

/** RFC 7807 — formato de erro retornado pela API. */
export interface ProblemDetails {
  type?: string
  title: string
  status: number
  detail?: string
  errors?: Record<string, string[]>
}
