import { useRef, useState, type CSSProperties } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Bell, ImageUp, Palette, RotateCcw, Trash2 } from 'lucide-react'
import { Button, Card, CardBody, CardHeader, Input, useToast } from '@/components/ui'
import { getErrorMessage } from '@/lib/api'
import { cn } from '@/lib/cn'
import type { CompanyBranding, CompanyDetail } from '@/types/domain'
import { companiesApi, companyKeys } from '../api'
import { useCompanyLogoUrl } from './useCompanyLogoUrl'
import { DEFAULT_PRIMARY, DEFAULT_SECONDARY, contrastWithWhite, isHexColor, themeVars } from './theme'

const MAX_LOGO = 1024 * 1024
const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp']

/** Sugestões de cor para começar rápido. */
const PRESETS = ['#167f74', '#1d4ed8', '#4338ca', '#7c3aed', '#be123c', '#c2410c', '#a16207', '#334155']

/** Aba "Identidade visual" da empresa: logotipo e cores do portal do cliente. */
export function CompanyBrandingTab({ company }: { company: CompanyDetail }) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const saved = company.branding
  const [primary, setPrimary] = useState(saved.primaryColor ?? '')
  const [secondary, setSecondary] = useState(saved.secondaryColor ?? '')
  const logoUrl = useCompanyLogoUrl(company.id, saved)

  const dirty = primary !== (saved.primaryColor ?? '') || secondary !== (saved.secondaryColor ?? '')
  const invalid = (!!primary && !isHexColor(primary)) || (!!secondary && !isHexColor(secondary))
  const lowContrast = isHexColor(primary) && contrastWithWhite(primary) < 3

  const applied = (b: CompanyBranding, message: string) => {
    toast.success(message)
    queryClient.setQueryData<CompanyDetail>(companyKeys.detail(company.id), (c) => (c ? { ...c, branding: b } : c))
    queryClient.invalidateQueries({ queryKey: companyKeys.all })
  }

  const colors = useMutation({
    mutationFn: () =>
      companiesApi.saveColors(company.id, { primaryColor: primary || null, secondaryColor: secondary || null }),
    onSuccess: (b) => applied(b, 'Cores do portal salvas.'),
    onError: (e) => toast.error(getErrorMessage(e, 'Não foi possível salvar as cores.')),
  })
  const upload = useMutation({
    mutationFn: (file: File) => companiesApi.uploadLogo(company.id, file),
    onSuccess: (b) => applied(b, 'Logotipo atualizado.'),
    onError: (e) => toast.error(getErrorMessage(e, 'Não foi possível enviar o logotipo.')),
  })
  const removeLogo = useMutation({
    mutationFn: () => companiesApi.removeLogo(company.id),
    onSuccess: (b) => applied(b, 'Logotipo removido.'),
    onError: (e) => toast.error(getErrorMessage(e, 'Não foi possível remover o logotipo.')),
  })

  const pickFile = (file: File | undefined) => {
    if (!file) return
    if (!LOGO_TYPES.includes(file.type)) return toast.error('Envie o logotipo em PNG, JPG ou WEBP.')
    if (file.size > MAX_LOGO) return toast.error('O logotipo deve ter até 1 MB.')
    upload.mutate(file)
  }

  const name = company.tradeName || company.legalName

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
      <Card>
        <CardHeader title="Identidade visual do portal" icon={<Palette className="h-5 w-5" />} />
        <CardBody className="space-y-6">
          <p className="text-sm text-slate-600">
            Os usuários de <strong className="font-semibold text-ink">{name}</strong> veem o portal com o logotipo e as
            cores definidos aqui. Campos vazios usam o visual padrão do Contix.
          </p>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-ink">Logotipo</h3>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex h-20 w-44 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-2">
                {logoUrl ? (
                  <img src={logoUrl} alt={`Logotipo de ${name}`} className="max-h-full max-w-full object-contain" />
                ) : (
                  <span className="text-xs text-slate-400">Sem logotipo</span>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    loading={upload.isPending}
                    onClick={() => fileRef.current?.click()}
                  >
                    <ImageUp className="h-4 w-4" /> {saved.hasLogo ? 'Trocar logotipo' : 'Enviar logotipo'}
                  </Button>
                  {saved.hasLogo && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:bg-red-50"
                      loading={removeLogo.isPending}
                      onClick={() => removeLogo.mutate()}
                    >
                      <Trash2 className="h-4 w-4" /> Remover
                    </Button>
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  PNG, JPG ou WEBP, até 1 MB. Prefira fundo transparente e formato horizontal.
                </p>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept={LOGO_TYPES.join(',')}
                className="hidden"
                onChange={(e) => {
                  pickFile(e.target.files?.[0])
                  e.target.value = ''
                }}
              />
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-ink">Cores</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <ColorField
                label="Cor principal"
                hint="Botões, links, menu ativo e destaques."
                value={primary}
                fallback={DEFAULT_PRIMARY}
                onChange={setPrimary}
              />
              <ColorField
                label="Cor secundária"
                hint="Faixa no topo do portal e detalhes."
                value={secondary}
                fallback={DEFAULT_SECONDARY}
                onChange={setSecondary}
              />
            </div>
            <div>
              <p className="mb-2 text-xs text-slate-500">Sugestões para a cor principal</p>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    title={c}
                    aria-label={`Usar ${c} como cor principal`}
                    onClick={() => setPrimary(c)}
                    className={cn(
                      'h-8 w-8 rounded-full border-2 border-white shadow ring-1 ring-slate-200 transition-transform hover:scale-110',
                      primary.toLowerCase() === c && 'ring-2 ring-ink',
                    )}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>
            {lowContrast && (
              <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                Esta cor é muito clara: o texto branco dos botões fica difícil de ler. Prefira um tom mais escuro.
              </p>
            )}
            <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
              <Button disabled={!dirty || invalid} loading={colors.isPending} onClick={() => colors.mutate()}>
                Salvar cores
              </Button>
              {dirty && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setPrimary(saved.primaryColor ?? '')
                    setSecondary(saved.secondaryColor ?? '')
                  }}
                >
                  Descartar
                </Button>
              )}
              {!dirty && (saved.primaryColor || saved.secondaryColor) && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setPrimary('')
                    setSecondary('')
                  }}
                >
                  <RotateCcw className="h-4 w-4" /> Voltar ao padrão
                </Button>
              )}
            </div>
          </section>
        </CardBody>
      </Card>

      <PortalPreview name={name} logoUrl={logoUrl} primary={primary} secondary={secondary} />
    </div>
  )
}

interface ColorFieldProps {
  label: string
  hint: string
  value: string
  fallback: string
  onChange: (v: string) => void
}

function ColorField({ label, hint, value, fallback, onChange }: ColorFieldProps) {
  const id = label.toLowerCase().replace(/\s/g, '-')
  const invalid = !!value && !isHexColor(value)
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-ink">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={`${label}: seletor`}
          value={isHexColor(value) ? value : fallback}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-12 shrink-0 rounded-lg border border-slate-300 bg-white p-1"
        />
        <div className="flex-1">
          <Input
            id={id}
            value={value}
            invalid={invalid}
            placeholder={`Padrão (${fallback})`}
            maxLength={7}
            className="font-mono uppercase placeholder:normal-case placeholder:font-sans"
            onChange={(e) => {
              const v = e.target.value.trim()
              onChange(v && !v.startsWith('#') ? `#${v}` : v)
            }}
          />
        </div>
      </div>
      <p className={cn('mt-1 text-xs', invalid ? 'text-red-600' : 'text-slate-500')}>
        {invalid ? 'Use o formato #RRGGBB.' : hint}
      </p>
    </div>
  )
}

/** Miniatura do portal com as cores escolhidas (antes de salvar). */
function PortalPreview({
  name,
  logoUrl,
  primary,
  secondary,
}: {
  name: string
  logoUrl: string | null
  primary: string
  secondary: string
}) {
  const style = themeVars(primary, secondary) as CSSProperties
  return (
    <Card className="self-start overflow-hidden">
      <CardHeader title="Prévia do portal" className="pb-3" />
      <div className="px-5 pb-5">
        <div style={style} className="overflow-hidden rounded-xl border border-slate-200 bg-surface text-ink shadow-sm">
          <div className="h-1 bg-gradient-to-r from-brand-600 to-accent" />
          <div className="flex h-12 items-center gap-3 border-b border-slate-200 bg-white px-3">
            {logoUrl ? (
              <img src={logoUrl} alt="" className="h-7 w-auto max-w-24 object-contain" />
            ) : (
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-600 text-[10px] font-bold text-white">
                {name.slice(0, 2).toUpperCase()}
              </span>
            )}
            <nav className="flex h-full items-center gap-3 text-[10px] font-semibold uppercase tracking-wide">
              <span className="relative flex h-full items-center text-brand-700 after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-brand-600">
                Início
              </span>
              <span className="text-slate-500">Documentos</span>
              <span className="text-slate-500">Portal</span>
            </nav>
            <Bell className="ml-auto h-3.5 w-3.5 text-slate-400" />
          </div>
          <div className="space-y-3 p-3">
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-700">Empresa selecionada</p>
              <p className="truncate text-sm font-semibold">{name}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-xs font-semibold">Próximos vencimentos</p>
              <div className="mt-2 flex items-center justify-between rounded-md bg-brand-50 px-2 py-1.5 text-[11px]">
                <span className="text-brand-800">DAS · Simples Nacional</span>
                <span className="rounded-full bg-brand-100 px-1.5 font-medium text-brand-700">20/11</span>
              </div>
              <div className="mt-3 flex gap-2">
                <span className="rounded-md bg-brand-600 px-2.5 py-1 text-[11px] font-medium text-white">
                  Nova solicitação
                </span>
                <span className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-medium">
                  Ver todos
                </span>
              </div>
            </div>
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-500">A prévia muda na hora. Salve para aplicar no portal.</p>
      </div>
    </Card>
  )
}
