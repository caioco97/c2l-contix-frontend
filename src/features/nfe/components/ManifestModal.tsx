import { useState } from 'react'
import { Button, FormField, Modal, Textarea } from '@/components/ui'
import { formatCpfCnpj } from '@/lib/br'
import { cn } from '@/lib/cn'
import { formatDate } from '@/lib/format'
import { MANIFESTATIONS, formatAccessKey, money } from '../meta'
import type { Nfe, NfeManifestation } from '../types'

type Choice = Exclude<NfeManifestation, 'SemManifestacao'>

interface Props {
  note: Nfe | null
  onClose: () => void
  onSubmit: (type: Choice, justification?: string) => Promise<void>
}

/** Escolha da manifestação do destinatário, com justificativa para "operação não realizada". */
export function ManifestModal({ note, onClose, onSubmit }: Props) {
  // Remonta a cada nota: o estado do formulário começa limpo.
  return note ? <ManifestForm key={note.id} note={note} onClose={onClose} onSubmit={onSubmit} /> : null
}

function ManifestForm({ note, onClose, onSubmit }: Props & { note: Nfe }) {
  const [type, setType] = useState<Choice | null>(note.manifestation === 'SemManifestacao' ? 'Ciencia' : 'Confirmada')
  const [justification, setJustification] = useState('')
  const [saving, setSaving] = useState(false)
  const options = MANIFESTATIONS.filter((m) => !(m.value === 'Ciencia' && note.manifestation === 'Ciencia'))
  const len = justification.trim().length
  const invalid = type === 'NaoRealizada' && (len < 15 || len > 255)

  const submit = async () => {
    if (!type || invalid) return
    setSaving(true)
    try {
      await onSubmit(type, type === 'NaoRealizada' ? justification.trim() : undefined)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Manifestar NF-e"
      description={`${note.issuerName} · Nº ${note.number} · ${money(note.total)}`}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={submit} loading={saving} disabled={!type || invalid}>
            Registrar manifestação
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <dl className="grid gap-2 rounded-lg bg-slate-50 p-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-slate-500">Emitente</dt>
            <dd className="text-ink">{formatCpfCnpj(note.issuerDocument)}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Emissão</dt>
            <dd className="text-ink">{formatDate(note.issuedAt)}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs text-slate-500">Chave de acesso</dt>
            <dd className="break-all font-mono text-xs text-ink">{formatAccessKey(note.accessKey)}</dd>
          </div>
        </dl>

        <fieldset className="space-y-2">
          <legend className="mb-1 text-sm font-medium text-slate-700">Como a empresa reconhece esta nota?</legend>
          {options.map((o) => (
            <label
              key={o.value}
              className={cn(
                'flex cursor-pointer gap-3 rounded-lg border p-3 transition-colors',
                type === o.value ? 'border-brand-500 bg-brand-50' : 'border-slate-200 hover:bg-slate-50',
              )}
            >
              <input
                type="radio"
                name="manifestacao"
                className="mt-1 accent-brand-600"
                checked={type === o.value}
                onChange={() => setType(o.value)}
              />
              <span>
                <span className="block text-sm font-medium text-ink">{o.label}</span>
                <span className="block text-xs text-slate-500">{o.description}</span>
              </span>
            </label>
          ))}
        </fieldset>

        {type === 'NaoRealizada' && (
          <FormField
            label="Justificativa"
            htmlFor="nfe-justificativa"
            required
            error={len > 0 && invalid ? 'Escreva de 15 a 255 caracteres.' : undefined}
            hint={`${len}/255 caracteres (mínimo 15).`}
          >
            <Textarea
              id="nfe-justificativa"
              rows={3}
              maxLength={255}
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Ex.: mercadoria devolvida no ato da entrega."
            />
          </FormField>
        )}

        {type && type !== 'Ciencia' && (
          <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
            Esta manifestação é definitiva: depois de registrada na SEFAZ, não pode ser alterada.
          </p>
        )}
      </div>
    </Modal>
  )
}
