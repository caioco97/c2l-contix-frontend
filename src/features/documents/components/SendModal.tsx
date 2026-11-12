import { useState } from 'react'
import { Mail } from 'lucide-react'
import { Button, FormField, Modal, Textarea } from '@/components/ui'

interface SendModalProps {
  open: boolean
  count: number
  onClose: () => void
  onSend: (message: string) => Promise<void>
}

export function SendModal({ open, count, onClose, onSend }: SendModalProps) {
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  const send = async () => {
    setSending(true)
    try {
      await onSend(message)
      setMessage('')
    } finally {
      setSending(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Enviar por e-mail"
      description={`${count} documento(s) · os usuários da empresa recebem um link seguro para o portal.`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={send} loading={sending}>
            <Mail className="h-4 w-4" />
            Enviar
          </Button>
        </>
      }
    >
      <FormField label="Mensagem (opcional)" htmlFor="send-message">
        <Textarea
          id="send-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Ex.: Seguem as guias do mês. Qualquer dúvida, estamos à disposição."
        />
      </FormField>
    </Modal>
  )
}
