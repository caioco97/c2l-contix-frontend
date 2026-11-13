import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button, Modal, useToast } from '@/components/ui'
import { getErrorMessage } from '@/lib/api'
import { formatCnpj } from '@/lib/format'
import { companiesApi, companyKeys } from '../api'

export interface CompanyToDelete {
  id: string
  legalName: string
  tradeName?: string | null
  document: string
}

interface Props {
  company: CompanyToDelete | null
  onClose: () => void
  onDeleted?: () => void
}

/**
 * Confirmação da exclusão de uma empresa (somente administrador do escritório).
 * A exclusão é lógica: a empresa some das listas e o histórico é preservado.
 */
export function DeleteCompanyModal({ company, onClose, onDeleted }: Props) {
  const toast = useToast()
  const queryClient = useQueryClient()

  const remove = useMutation({
    mutationFn: (id: string) => companiesApi.remove(id),
    onSuccess: () => {
      toast.success('Empresa excluída.')
      queryClient.invalidateQueries({ queryKey: companyKeys.all })
      onClose()
      onDeleted?.()
    },
    onError: (e) => toast.error(getErrorMessage(e, 'Não foi possível excluir a empresa.')),
  })

  const name = company ? company.tradeName || company.legalName : ''

  return (
    <Modal
      open={!!company}
      onClose={onClose}
      title="Excluir empresa?"
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="danger" loading={remove.isPending} onClick={() => company && remove.mutate(company.id)}>
            Excluir empresa
          </Button>
        </>
      }
    >
      {company && (
        <div className="space-y-3 text-sm text-slate-600">
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
            <p className="font-medium text-ink">{name}</p>
            <p className="text-xs text-slate-500">
              {company.tradeName && company.tradeName !== company.legalName ? `${company.legalName} · ` : ''}
              <span className="font-mono">{formatCnpj(company.document)}</span>
            </p>
          </div>
          <ul className="list-disc space-y-1 pl-5">
            <li>A empresa deixa de aparecer nas listas e no seletor de empresas.</li>
            <li>Usuários do portal que só têm esta empresa perdem o acesso na hora.</li>
            <li>Documentos, solicitações, certidões e histórico ficam guardados, mas não aparecem mais.</li>
          </ul>
        </div>
      )}
    </Modal>
  )
}
