import { useMutation } from '@tanstack/react-query'
import { useToast } from '@/components/ui'
import { getErrorMessage } from '@/lib/api'
import { saveFile } from '@/lib/download'
import type { Cnd } from '@/types/domain'
import { cndApi } from './api'

export function useDownloadCnd() {
  const toast = useToast()
  return useMutation({
    mutationFn: (cnd: Cnd) => cndApi.download(cnd.companyId, cnd),
    onSuccess: saveFile,
    onError: (e) => toast.error(getErrorMessage(e, 'Não foi possível baixar a certidão.')),
  })
}
