import { Paperclip, X } from 'lucide-react'
import { formatBytes } from '@/lib/format'

interface Props {
  files: File[]
  onChange: (files: File[]) => void
  label?: string
  error?: string
  hint?: string | null
  required?: boolean
}

/** Seleção de anexos com lista removível. */
export function AttachmentPicker({ files, onChange, label = 'Anexos', error, hint, required }: Props) {
  return (
    <div className="space-y-2">
      <span className="block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </span>
      {hint && hint !== error && <p className="text-xs text-slate-500">{hint}</p>}
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-600 focus-within:ring-2 focus-within:ring-brand-200 hover:border-brand-400 hover:text-brand-700">
        <Paperclip className="h-4 w-4" />
        Adicionar arquivos
        <input
          type="file"
          multiple
          className="sr-only"
          onChange={(e) => {
            onChange([...files, ...Array.from(e.target.files ?? [])])
            e.target.value = ''
          }}
        />
      </label>
      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
      {files.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`} className="flex items-center gap-2 rounded-full bg-slate-100 py-1 pl-3 pr-1 text-xs">
              {f.name} <span className="text-slate-400">{formatBytes(f.size)}</span>
              <button
                type="button"
                aria-label={`Remover ${f.name}`}
                onClick={() => onChange(files.filter((_, j) => j !== i))}
                className="rounded-full p-0.5 hover:bg-slate-200"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
