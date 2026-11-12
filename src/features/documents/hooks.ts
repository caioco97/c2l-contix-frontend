import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/ui'
import { useActiveCompany } from '@/features/companies/ActiveCompanyContext'
import { getErrorMessage } from '@/lib/api'
import { documentKeys, documentsApi, saveBlob } from './api'

export function useDownloadDocuments() {
  const { company } = useActiveCompany()
  const queryClient = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: (ids: string[]) => documentsApi.download(company!.id, ids),
    onSuccess: ({ blob, fileName }) => {
      saveBlob(blob, fileName)
      queryClient.invalidateQueries({ queryKey: documentKeys.all(company!.id) })
    },
    onError: (e) => toast.error(getErrorMessage(e, 'Não foi possível baixar.')),
  })
}
