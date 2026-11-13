import { useRef, useState } from 'react'
import { CheckCircle2, FileCode2, RefreshCw, TriangleAlert, Upload, XCircle } from 'lucide-react'
import { Button, Modal, useToast } from '@/components/ui'
import { getErrorMessage } from '@/lib/api'
import { formatBytes } from '@/lib/format'
import { nfeApi } from '../api'
import type { ImportOutcome, ImportResult } from '../types'

const icons: Record<ImportOutcome, React.ReactNode> = {
  Importada: <CheckCircle2 className="h-4 w-4 text-emerald-600" />,
  Atualizada: <RefreshCw className="h-4 w-4 text-sky-600" />,
  Ignorada: <TriangleAlert className="h-4 w-4 text-amber-600" />,
  Erro: <XCircle className="h-4 w-4 text-red-600" />,
}

/** Importação manual de XMLs de NF-e (escritório). */
export function ImportXmlModal({ companyId, open, onClose, onImported }: { companyId: string; open: boolean; onClose: () => void; onImported: () => void }) {
  const [files, setFiles] = useState<File[]>([])
  const [result, setResult] = useState<ImportResult | null>(null)
  const [sending, setSending] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const toast = useToast()

  const close = () => {
    setFiles([])
    setResult(null)
    onClose()
  }

  const send = async () => {
    setSending(true)
    try {
      const r = await nfeApi.importXml(companyId, files)
      setResult(r)
      if (r.imported + r.updated > 0) onImported()
    } catch (e) {
      toast.error(getErrorMessage(e, 'Não foi possível importar os XMLs.'))
    } finally {
      setSending(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="Importar XML de NF-e"
      description="Envie os XMLs completos (nfeProc) das notas emitidas contra o CNPJ da empresa. Notas repetidas não são duplicadas."
      size="lg"
      footer={
        result ? (
          <Button onClick={close}>Concluir</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={close}>
              Cancelar
            </Button>
            <Button onClick={send} loading={sending} disabled={files.length === 0}>
              <Upload className="h-4 w-4" /> Importar {files.length > 0 && `(${files.length})`}
            </Button>
          </>
        )
      }
    >
      {result ? (
        <div className="space-y-3">
          <p className="text-sm text-slate-700">
            {result.imported} importada(s), {result.updated} atualizada(s), {result.ignored} ignorada(s) e {result.errors} com erro.
          </p>
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
            {result.files.map((f, i) => (
              <li key={i} className="flex items-start gap-2 px-3 py-2 text-sm">
                <span className="mt-0.5">{icons[f.outcome]}</span>
                <span className="min-w-0">
                  <span className="block truncate font-medium text-ink">{f.file}</span>
                  {f.message && <span className="block text-xs text-slate-500">{f.message}</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => input.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              setFiles([...e.dataTransfer.files].filter((f) => f.name.toLowerCase().endsWith('.xml')))
            }}
            className="flex w-full flex-col items-center gap-2 rounded-lg border-2 border-dashed border-slate-300 px-4 py-8 text-sm text-slate-500 hover:border-brand-400 hover:bg-brand-50/40"
          >
            <FileCode2 className="h-7 w-7 text-brand-600" />
            Arraste os arquivos .xml aqui ou clique para escolher (até 100 por vez)
          </button>
          <input
            ref={input}
            type="file"
            accept=".xml,application/xml,text/xml"
            multiple
            hidden
            onChange={(e) => setFiles([...(e.target.files ?? [])])}
          />
          {files.length > 0 && (
            <ul className="max-h-48 space-y-1 overflow-y-auto text-sm">
              {files.map((f) => (
                <li key={f.name + f.size} className="flex justify-between gap-2 text-slate-700">
                  <span className="truncate">{f.name}</span>
                  <span className="shrink-0 text-xs text-slate-400">{formatBytes(f.size)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Modal>
  )
}
