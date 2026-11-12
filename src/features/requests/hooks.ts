import { useQuery } from '@tanstack/react-query'
import { requestKeys, requestsApi } from './api'

export function useRequestTypes() {
  return useQuery({ queryKey: requestKeys.types, queryFn: requestsApi.types, staleTime: 60 * 60_000 })
}
