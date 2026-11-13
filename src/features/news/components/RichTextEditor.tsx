import { useEffect, useState, type ReactNode } from 'react'
import { EditorContent, useEditor, useEditorState, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import {
  Bold,
  Check,
  Heading2,
  Heading3,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Strikethrough,
  Underline,
  Undo2,
  Unlink,
  X,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { toEditorHtml } from '@/lib/richText'

interface Props {
  id?: string
  value: string
  onChange: (html: string) => void
  onBlur?: () => void
  invalid?: boolean
  placeholder?: string
}

/** Editor de texto rico (TipTap) com negrito, itálico, títulos, listas, citação e links. Emite HTML. */
export function RichTextEditor({ id, value, onChange, onBlur, invalid, placeholder }: Props) {
  const [linkOpen, setLinkOpen] = useState(false)
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        code: false,
        codeBlock: false,
        horizontalRule: false,
        link: {
          openOnClick: false,
          autolink: true,
          defaultProtocol: 'https',
          protocols: ['http', 'https', 'mailto', 'tel'],
          isAllowedUri: (url) => /^(https?:|mailto:|tel:)/i.test(url),
          // Os atributos de segurança são aplicados na exibição; não precisam ir para o HTML salvo.
          HTMLAttributes: { target: null, rel: null, class: null },
        },
      }),
    ],
    content: toEditorHtml(value),
    editorProps: {
      attributes: {
        ...(id ? { id } : {}),
        role: 'textbox',
        'aria-multiline': 'true',
        ...(placeholder ? { 'aria-placeholder': placeholder, 'data-placeholder': placeholder } : {}),
        class: 'rich-content min-h-48 max-h-[28rem] overflow-y-auto px-3 py-2 focus:outline-none',
      },
    },
    onUpdate: ({ editor }) => onChange(editor.isEmpty ? '' : editor.getHTML()),
    onBlur: () => onBlur?.(),
  })

  // Valor trocado de fora (ex.: o formulário carregou a notícia para edição).
  useEffect(() => {
    if (!editor) return
    const current = editor.isEmpty ? '' : editor.getHTML()
    if (value !== current) editor.commands.setContent(toEditorHtml(value), { emitUpdate: false })
  }, [editor, value])

  return (
    <div
      className={cn(
        'rounded-lg border bg-white text-sm focus-within:ring-2',
        invalid ? 'border-red-400 focus-within:ring-red-200' : 'border-slate-300 focus-within:border-brand-500 focus-within:ring-brand-100',
      )}
    >
      {editor && <Toolbar editor={editor} linkOpen={linkOpen} onToggleLink={() => setLinkOpen((o) => !o)} />}
      {editor && linkOpen && <LinkBar editor={editor} onClose={() => setLinkOpen(false)} />}
      <EditorContent editor={editor} className={cn(editor?.isEmpty && 'is-empty')} />
    </div>
  )
}

function Toolbar({ editor, linkOpen, onToggleLink }: { editor: Editor; linkOpen: boolean; onToggleLink: () => void }) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      underline: e.isActive('underline'),
      strike: e.isActive('strike'),
      h2: e.isActive('heading', { level: 2 }),
      h3: e.isActive('heading', { level: 3 }),
      bullet: e.isActive('bulletList'),
      ordered: e.isActive('orderedList'),
      quote: e.isActive('blockquote'),
      link: e.isActive('link'),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  })
  const chain = () => editor.chain().focus()

  return (
    <div role="toolbar" aria-label="Formatação" className="flex flex-wrap items-center gap-0.5 border-b border-slate-200 px-1.5 py-1">
      <ToolButton label="Negrito (Ctrl+B)" active={s.bold} onClick={() => chain().toggleBold().run()}>
        <Bold />
      </ToolButton>
      <ToolButton label="Itálico (Ctrl+I)" active={s.italic} onClick={() => chain().toggleItalic().run()}>
        <Italic />
      </ToolButton>
      <ToolButton label="Sublinhado (Ctrl+U)" active={s.underline} onClick={() => chain().toggleUnderline().run()}>
        <Underline />
      </ToolButton>
      <ToolButton label="Tachado" active={s.strike} onClick={() => chain().toggleStrike().run()}>
        <Strikethrough />
      </ToolButton>
      <Divider />
      <ToolButton label="Título" active={s.h2} onClick={() => chain().toggleHeading({ level: 2 }).run()}>
        <Heading2 />
      </ToolButton>
      <ToolButton label="Subtítulo" active={s.h3} onClick={() => chain().toggleHeading({ level: 3 }).run()}>
        <Heading3 />
      </ToolButton>
      <Divider />
      <ToolButton label="Lista com marcadores" active={s.bullet} onClick={() => chain().toggleBulletList().run()}>
        <List />
      </ToolButton>
      <ToolButton label="Lista numerada" active={s.ordered} onClick={() => chain().toggleOrderedList().run()}>
        <ListOrdered />
      </ToolButton>
      <ToolButton label="Citação" active={s.quote} onClick={() => chain().toggleBlockquote().run()}>
        <Quote />
      </ToolButton>
      <Divider />
      <ToolButton label={s.link ? 'Editar link' : 'Inserir link'} active={s.link || linkOpen} onClick={onToggleLink}>
        <Link2 />
      </ToolButton>
      {s.link && (
        <ToolButton label="Remover link" onClick={() => chain().extendMarkRange('link').unsetLink().run()}>
          <Unlink />
        </ToolButton>
      )}
      <div className="ml-auto flex gap-0.5">
        <ToolButton label="Desfazer (Ctrl+Z)" disabled={!s.canUndo} onClick={() => chain().undo().run()}>
          <Undo2 />
        </ToolButton>
        <ToolButton label="Refazer (Ctrl+Shift+Z)" disabled={!s.canRedo} onClick={() => chain().redo().run()}>
          <Redo2 />
        </ToolButton>
      </div>
    </div>
  )
}

/** Campo para digitar o endereço do link aplicado ao texto selecionado. */
function LinkBar({ editor, onClose }: { editor: Editor; onClose: () => void }) {
  const [url, setUrl] = useState(() => (editor.getAttributes('link').href as string | undefined) ?? '')
  const [error, setError] = useState<string | null>(null)

  const apply = () => {
    const raw = url.trim()
    if (!raw) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      onClose()
      return
    }
    const href = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : raw.includes('@') && !raw.includes('/') ? `mailto:${raw}` : `https://${raw}`
    if (!/^(https?:|mailto:|tel:)/i.test(href)) {
      setError('Use um endereço que comece com http://, https://, mailto: ou tel:.')
      return
    }
    const chain = editor.chain().focus().extendMarkRange('link')
    if (editor.state.selection.empty && !editor.isActive('link')) chain.insertContent({ type: 'text', text: raw, marks: [{ type: 'link', attrs: { href } }] }).run()
    else chain.setLink({ href }).run()
    onClose()
  }

  return (
    <div className="space-y-1 border-b border-slate-200 bg-slate-50 px-2 py-1.5">
      <div className="flex items-center gap-1.5">
        <input
          autoFocus
          type="url"
          aria-label="Endereço do link"
          placeholder="https://exemplo.com.br"
          className="h-8 min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value)
            setError(null)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              apply()
            } else if (e.key === 'Escape') {
              e.preventDefault()
              onClose()
              editor.commands.focus()
            }
          }}
        />
        <ToolButton label="Aplicar link" onClick={apply}>
          <Check />
        </ToolButton>
        <ToolButton label="Cancelar" onClick={onClose}>
          <X />
        </ToolButton>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}

function ToolButton({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active ?? undefined}
      disabled={disabled}
      // Mantém a seleção do editor ao clicar no botão.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        'inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-600 transition-colors [&>svg]:h-4 [&>svg]:w-4',
        'hover:bg-slate-100 hover:text-slate-900 disabled:pointer-events-none disabled:opacity-40',
        active && 'bg-brand-50 text-brand-700 hover:bg-brand-100 hover:text-brand-800',
      )}
    >
      {children}
    </button>
  )
}

function Divider() {
  return <span aria-hidden className="mx-1 h-5 w-px bg-slate-200" />
}
