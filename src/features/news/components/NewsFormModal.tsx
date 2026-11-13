import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format, parseISO } from 'date-fns'
import { ImagePlus, Undo2, X } from 'lucide-react'
import { Button, Checkbox, FormField, Input, Modal, Select, Spinner } from '@/components/ui'
import { companiesApi } from '@/features/companies/api'
import { officeNewsApi, newsKeys } from '@/features/news/api'
import { NEWS_AUDIENCES, TAX_REGIMES } from '@/features/news/meta'
import { RichTextEditor } from './RichTextEditor'
import { AttachmentPicker } from '@/features/requests/components/AttachmentPicker'
import { cn } from '@/lib/cn'
import { formatBytes } from '@/lib/format'
import { htmlToText, toEditorHtml } from '@/lib/richText'
import { useBlobUrl, useObjectUrl } from '@/lib/useBlobUrl'
import type { NewsInput, OfficeNewsDetail } from '@/types/domain'

const MAX_IMAGE = 5 * 1024 * 1024
const MAX_FILE = 25 * 1024 * 1024

const schema = z
  .object({
    title: z.string().trim().min(1, 'Informe o título.').max(200, 'Máximo de 200 caracteres.'),
    summary: z.string().max(500, 'Máximo de 500 caracteres.'),
    content: z
      .string()
      .refine((html) => htmlToText(html).length > 0, 'Escreva o conteúdo.')
      .refine((html) => html.length <= 20_000, 'O conteúdo, com a formatação, pode ter no máximo 20.000 caracteres.'),
    publishAt: z.string(),
    expiresAt: z.string(),
    audience: z.enum(['Todos', 'EmpresasSelecionadas', 'RegimeTributario']),
    companyIds: z.array(z.string()),
    regimes: z.array(z.enum(['SimplesNacional', 'LucroPresumido', 'LucroReal', 'MEI', 'Imune', 'Isento', 'Outro'])),
    image: z
      .instanceof(File)
      .nullable()
      .refine((f) => !f || f.size <= MAX_IMAGE, 'A imagem pode ter no máximo 5 MB.'),
    removeImage: z.boolean(),
    attachments: z.array(z.instanceof(File)).refine((fs) => fs.every((f) => f.size <= MAX_FILE), 'Cada anexo pode ter no máximo 25 MB.'),
    removedAttachmentIds: z.array(z.string()),
  })
  .refine((v) => v.audience !== 'EmpresasSelecionadas' || v.companyIds.length > 0, {
    path: ['companyIds'],
    message: 'Selecione ao menos uma empresa.',
  })
  .refine((v) => v.audience !== 'RegimeTributario' || v.regimes.length > 0, {
    path: ['regimes'],
    message: 'Selecione ao menos um regime.',
  })
  .refine((v) => !v.expiresAt || new Date(v.expiresAt) > (v.publishAt ? new Date(v.publishAt) : new Date()), {
    path: ['expiresAt'],
    message: 'A expiração deve ser depois da publicação.',
  })
type FormValues = z.infer<typeof schema>

const toLocal = (iso: string | null | undefined) => (iso ? format(parseISO(iso), "yyyy-MM-dd'T'HH:mm") : '')
const toIso = (local: string) => (local ? new Date(local).toISOString() : undefined)

function defaults(n?: OfficeNewsDetail): FormValues {
  return {
    title: n?.title ?? '',
    summary: n?.summary ?? '',
    content: toEditorHtml(n?.content),
    publishAt: toLocal(n?.publishAt),
    expiresAt: toLocal(n?.expiresAt),
    audience: n?.audience ?? 'Todos',
    companyIds: n?.companies.map((c) => c.id) ?? [],
    regimes: n?.regimes ?? [],
    image: null,
    removeImage: false,
    attachments: [],
    removedAttachmentIds: [],
  }
}

interface Props {
  open: boolean
  /** Notícia a editar; sem id, cria uma nova. */
  newsId?: string | null
  onClose: () => void
  onSubmit: (input: NewsInput) => Promise<void>
}

export function NewsFormModal({ open, newsId, onClose, onSubmit }: Props) {
  const editing = !!newsId
  const { data: current, isLoading } = useQuery({
    queryKey: newsKeys.officeDetail(newsId ?? ''),
    queryFn: () => officeNewsApi.get(newsId!),
    enabled: open && editing,
  })
  const companies = useQuery({ queryKey: ['companies', 'mine'], queryFn: companiesApi.listMine, enabled: open })
  const currentImage = useBlobUrl(['news', 'office', 'image', newsId], () => officeNewsApi.image(newsId!), open && !!current?.hasImage)

  const imageRef = useRef<HTMLInputElement>(null)
  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: defaults() })
  const [audience, image, removeImage, removed] = useWatch({
    control,
    name: ['audience', 'image', 'removeImage', 'removedAttachmentIds'],
  })
  const newImageUrl = useObjectUrl(image)

  useEffect(() => {
    if (!open) return
    if (!editing) reset(defaults())
    else if (current) reset(defaults(current))
  }, [open, editing, current, reset])

  const submit = handleSubmit(async (v) => {
    await onSubmit({
      title: v.title.trim(),
      summary: v.summary.trim() || undefined,
      content: v.content,
      publishAt: toIso(v.publishAt),
      expiresAt: toIso(v.expiresAt),
      audience: v.audience,
      companyIds: v.audience === 'EmpresasSelecionadas' ? v.companyIds : [],
      regimes: v.audience === 'RegimeTributario' ? v.regimes : [],
      image: v.image,
      removeImage: v.removeImage,
      attachments: v.attachments,
      removedAttachmentIds: v.removedAttachmentIds,
    })
  })

  const shownImage = newImageUrl ?? (!removeImage ? currentImage : null)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Editar notícia' : 'Nova notícia'}
      description="Os clientes veem a notícia na tela Início do portal."
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={submit} loading={isSubmitting} disabled={editing && !current}>
            {editing ? 'Salvar' : 'Publicar'}
          </Button>
        </>
      }
    >
      {editing && isLoading ? (
        <Spinner />
      ) : (
        <form onSubmit={submit} noValidate className="space-y-4">
          <FormField label="Título" htmlFor="news-title" error={errors.title?.message} required>
            <Input id="news-title" invalid={!!errors.title} {...register('title')} />
          </FormField>
          <FormField
            label="Resumo"
            htmlFor="news-summary"
            error={errors.summary?.message}
            hint="Aparece na lista do portal. Se ficar vazio, usamos o começo do conteúdo."
          >
            <Input id="news-summary" {...register('summary')} />
          </FormField>
          <FormField
            label="Conteúdo"
            htmlFor="news-content"
            error={errors.content?.message}
            hint="Use a barra para negrito, títulos, listas e links. Para um link, selecione o texto e clique no ícone de link."
            required
          >
            <Controller
              control={control}
              name="content"
              render={({ field }) => (
                <RichTextEditor
                  id="news-content"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  invalid={!!errors.content}
                  placeholder="Escreva a notícia…"
                />
              )}
            />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Publicar em" htmlFor="news-publish" hint="Vazio publica agora. Uma data futura agenda.">
              <Input id="news-publish" type="datetime-local" {...register('publishAt')} />
            </FormField>
            <FormField label="Expira em" htmlFor="news-expires" error={errors.expiresAt?.message} hint="Opcional. Depois dela a notícia sai do portal.">
              <Input id="news-expires" type="datetime-local" invalid={!!errors.expiresAt} {...register('expiresAt')} />
            </FormField>
          </div>

          <FormField label="Público" htmlFor="news-audience" required>
            <Select id="news-audience" options={NEWS_AUDIENCES} {...register('audience')} />
          </FormField>

          {audience === 'EmpresasSelecionadas' && (
            <Controller
              control={control}
              name="companyIds"
              render={({ field }) => (
                <fieldset className="space-y-2">
                  <legend className="text-sm font-medium text-slate-700">Empresas</legend>
                  <div className={cn('max-h-48 space-y-1 overflow-y-auto rounded-lg border p-2', errors.companyIds ? 'border-red-300' : 'border-slate-200')}>
                    {companies.isLoading ? (
                      <Spinner className="py-2" />
                    ) : (
                      (companies.data ?? []).map((c) => (
                        <label key={c.id} className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-slate-50">
                          <Checkbox
                            checked={field.value.includes(c.id)}
                            onChange={(e) =>
                              field.onChange(e.target.checked ? [...field.value, c.id] : field.value.filter((id) => id !== c.id))
                            }
                          />
                          <span className="truncate">{c.tradeName}</span>
                          {c.nickname && <span className="text-xs text-slate-400">{c.nickname}</span>}
                        </label>
                      ))
                    )}
                  </div>
                  {errors.companyIds && <p className="text-xs text-red-600">{errors.companyIds.message}</p>}
                </fieldset>
              )}
            />
          )}

          {audience === 'RegimeTributario' && (
            <Controller
              control={control}
              name="regimes"
              render={({ field }) => (
                <fieldset className="space-y-2">
                  <legend className="text-sm font-medium text-slate-700">Regimes tributários</legend>
                  <div className="flex flex-wrap gap-x-4 gap-y-2">
                    {TAX_REGIMES.map((r) => (
                      <label key={r.value} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={field.value.includes(r.value)}
                          onChange={(e) =>
                            field.onChange(e.target.checked ? [...field.value, r.value] : field.value.filter((x) => x !== r.value))
                          }
                        />
                        {r.label}
                      </label>
                    ))}
                  </div>
                  {errors.regimes && <p className="text-xs text-red-600">{errors.regimes.message}</p>}
                </fieldset>
              )}
            />
          )}

          <div className="space-y-2">
            <span className="block text-sm font-medium text-slate-700">Imagem de capa</span>
            {shownImage && (
              <div className="relative">
                <img src={shownImage} alt="Pré-visualização da capa" className="max-h-48 w-full rounded-lg object-cover" />
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute right-2 top-2"
                  aria-label="Remover imagem"
                  onClick={() => (image ? setValue('image', null) : setValue('removeImage', true))}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
            {!shownImage && (
              <div className="flex items-center gap-3">
                <Button variant="secondary" size="sm" onClick={() => imageRef.current?.click()}>
                  <ImagePlus className="h-4 w-4" /> {current?.hasImage ? 'Trocar imagem' : 'Adicionar imagem'}
                </Button>
                {removeImage && (
                  <Button variant="ghost" size="sm" onClick={() => setValue('removeImage', false)}>
                    <Undo2 className="h-4 w-4" /> Manter a imagem atual
                  </Button>
                )}
              </div>
            )}
            <input
              ref={imageRef}
              type="file"
              accept=".png,.jpg,.jpeg,.webp,.gif"
              className="sr-only"
              onChange={(e) => {
                setValue('image', e.target.files?.[0] ?? null, { shouldValidate: true })
                e.target.value = ''
              }}
            />
            {errors.image && <p className="text-xs text-red-600">{errors.image.message}</p>}
          </div>

          {current && current.attachments.length > 0 && (
            <div className="space-y-2">
              <span className="block text-sm font-medium text-slate-700">Anexos atuais</span>
              <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                {current.attachments.map((a) => {
                  const isRemoved = removed.includes(a.id)
                  return (
                    <li key={a.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                      <span className={cn('min-w-0 flex-1 truncate', isRemoved && 'text-slate-400 line-through')}>{a.fileName}</span>
                      <span className="text-xs text-slate-500">{formatBytes(a.sizeBytes)}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={isRemoved ? `Manter ${a.fileName}` : `Remover ${a.fileName}`}
                        onClick={() =>
                          setValue('removedAttachmentIds', isRemoved ? removed.filter((id) => id !== a.id) : [...removed, a.id])
                        }
                      >
                        {isRemoved ? <Undo2 className="h-4 w-4" /> : <X className="h-4 w-4" />}
                      </Button>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          <Controller
            control={control}
            name="attachments"
            render={({ field }) => (
              <AttachmentPicker
                label={current?.attachments.length ? 'Novos anexos' : 'Anexos'}
                files={field.value}
                onChange={field.onChange}
                error={errors.attachments?.message}
              />
            )}
          />
        </form>
      )}
    </Modal>
  )
}
