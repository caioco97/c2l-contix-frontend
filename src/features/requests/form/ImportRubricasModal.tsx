import { useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, FileSpreadsheet, Upload } from 'lucide-react'
import { Button, Modal, useToast } from '@/components/ui'
import { getErrorMessage } from '@/lib/api'
import { saveFile } from '@/lib/download'
import { requestsApi, type RubricasImport } from '../api'

interface Props {
  companyId: string
  open: boolean
  onClose: () => void
  onUse: (rows: RubricasImport['valid']) => void
}

const FIELD_LABEL: Record<string, string> = {
  empregado: 'Empregado',
  rubrica: 'Rubrica',
  quantidade: 'Quantidade',
  valor: 'Valor',
}

/** Lançamento de rubricas por planilha (CTX-77): baixar o modelo, preencher e trazer para o formulário. */
export function ImportRubricasModal({ companyId, open, onClose, onUse }: Props) {
  const toast = useToast()
  const input = useRef<HTMLInputElement>(null)
  const [result, setResult] = useState<RubricasImport | null>(null)
  const [fileName, setFileName] = useState('')

  const template = useMutation({
    mutationFn: (format: 'Xlsx' | 'Csv') => requestsApi.rubricasTemplate(companyId, format),
    onSuccess: saveFile,
    onError: (e) => toast.error(getErrorMessage(e, 'Não foi possível baixar o modelo.')),
  })
  const read = useMutation({
    mutationFn: (file: File) => requestsApi.importRubricas(companyId, file),
    onSuccess: setResult,
    onError: (e) => {
      setResult(null)
      toast.error(getErrorMessage(e, 'Não foi possível ler a planilha.'))
    },
  })

  const close = () => {
    setResult(null)
    setFileName('')
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={close}
      size="lg"
      title="Importar lançamentos de uma planilha"
      description="Baixe o modelo (já vem com os empregados ativos), preencha a rubrica e a quantidade ou o valor, e envie."
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Cancelar
          </Button>
          <Button
            disabled={!result || result.valid.length === 0}
            onClick={() => {
              onUse(result!.valid)
              close()
            }}
          >
            {result && result.valid.length > 0
              ? `Usar ${result.valid.length} lançamento${result.valid.length === 1 ? '' : 's'}`
              : 'Usar lançamentos'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-slate-600">Modelo:</span>
          <Button
            size="sm"
            variant="secondary"
            loading={template.isPending && template.variables === 'Xlsx'}
            onClick={() => template.mutate('Xlsx')}
          >
            <FileSpreadsheet className="h-4 w-4" /> Excel (.xlsx)
          </Button>
          <Button
            size="sm"
            variant="ghost"
            loading={template.isPending && template.variables === 'Csv'}
            onClick={() => template.mutate('Csv')}
          >
            CSV
          </Button>
        </div>

        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-300 px-4 py-6 text-center hover:border-brand-400">
          <Upload className="h-6 w-6 text-slate-400" />
          <span className="text-sm font-medium text-ink">{fileName || 'Escolha a planilha preenchida'}</span>
          <span className="text-xs text-slate-500">.xlsx ou .csv, até 500 linhas e 2 MB</span>
          <input
            ref={input}
            type="file"
            accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (!file) return
              setFileName(file.name)
              read.mutate(file)
              e.target.value = ''
            }}
          />
        </label>

        {read.isPending && <p className="text-sm text-slate-500">Lendo a planilha…</p>}

        {result && !read.isPending && (
          <div className="space-y-3">
            <p className="flex items-center gap-2 text-sm text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              {result.valid.length} de {result.total} linha{result.total === 1 ? '' : 's'} pronta
              {result.valid.length === 1 ? '' : 's'} para lançar.
            </p>
            {result.errors.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="mb-2 flex items-center gap-2 text-sm font-medium text-amber-900">
                  <AlertTriangle className="h-4 w-4" /> Linhas com problema (ficam de fora; corrija e envie de novo se quiser)
                </p>
                <ul className="max-h-48 space-y-1 overflow-y-auto text-sm text-amber-900">
                  {result.errors.map((e, i) => (
                    <li key={i}>
                      <span className="font-mono text-xs">Linha {e.line}</span> · {FIELD_LABEL[e.field] ?? e.field}: {e.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {result.valid.length > 0 && (
              <p className="text-xs text-slate-500">
                Os lançamentos substituem os do formulário e ainda podem ser revisados antes de enviar.
              </p>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
