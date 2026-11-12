import { Button } from './Button'
import { Modal } from './Modal'

interface Props {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  loading?: boolean
  onConfirm: () => void
  onClose: () => void
}

/** Confirmação de ação destrutiva (no lugar de window.confirm). */
export function ConfirmModal({ open, title, description, confirmLabel = 'Excluir', loading, onConfirm, onClose }: Props) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-slate-600">{description}</p>
    </Modal>
  )
}
