import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { ArrowLeftRight, Building2, Check, ChevronDown, Search } from 'lucide-react'
import { Avatar, Button, EmptyState, Input, Skeleton, Spinner } from '@/components/ui'
import { useAuth } from '@/features/auth/AuthContext'
import { cn } from '@/lib/cn'
import { formatCpfCnpj } from '@/lib/br'
import type { Company } from '@/types/domain'
import { useActiveCompany } from './ActiveCompanyContext'
import { CompanyLogo } from './branding/CompanyLogo'

/*
 * Seleção de empresa padronizada para as telas que trabalham com uma empresa por vez
 * (Início, Documentos, CND e Portal do Cliente):
 * - CompanyContextBar: faixa no topo com a empresa selecionada e o botão "Trocar empresa".
 * - CompanyGate: enquanto nenhuma empresa foi escolhida, mostra a lista para escolher no lugar do conteúdo.
 * - CompanyList: lista pesquisável (razão social, nome fantasia, apelido ou CNPJ) usada pelos dois.
 */

const normalize = (v: string) =>
  v
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()

function matches(company: Company, term: string) {
  const t = normalize(term.trim())
  if (!t) return true
  const digits = term.replace(/\D/g, '')
  if (digits.length >= 2 && company.document.includes(digits)) return true
  return [company.legalName, company.tradeName, company.nickname].some((v) => v && normalize(v).includes(t))
}

interface CompanyListProps {
  companies: Company[]
  selectedId?: string
  onSelect: (id: string) => void
  autoFocus?: boolean
  className?: string
}

/** Lista pesquisável de empresas, navegável pelo teclado (setas e Enter). */
export function CompanyList({ companies, selectedId, onSelect, autoFocus, className }: CompanyListProps) {
  const [term, setTerm] = useState('')
  // Ao abrir, o destaque começa na empresa já selecionada.
  const [active, setActive] = useState(() => Math.max(companies.findIndex((c) => c.id === selectedId), 0))
  const listId = useId()
  const listRef = useRef<HTMLUListElement>(null)
  const filtered = useMemo(() => companies.filter((c) => matches(c, term)), [companies, term])
  const activeIndex = Math.min(active, Math.max(filtered.length - 1, 0))

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && filtered[activeIndex]) {
      e.preventDefault()
      onSelect(filtered[activeIndex].id)
    }
  }

  return (
    <div className={cn('flex min-h-0 flex-col', className)}>
      <div className="border-b border-slate-100 p-3">
        <Input
          autoFocus={autoFocus}
          value={term}
          onChange={(e) => {
            setTerm(e.target.value)
            setActive(0)
          }}
          onKeyDown={onKeyDown}
          placeholder="Buscar por nome, apelido ou CNPJ"
          aria-label="Buscar empresa"
          role="combobox"
          aria-expanded
          aria-controls={listId}
          aria-activedescendant={filtered[activeIndex] ? `${listId}-${filtered[activeIndex].id}` : undefined}
          leftIcon={<Search className="h-4 w-4" />}
        />
        <p className="mt-2 text-xs text-slate-500">
          {term
            ? `${filtered.length} de ${companies.length} empresas`
            : `${companies.length} ${companies.length === 1 ? 'empresa disponível' : 'empresas disponíveis'}`}
        </p>
      </div>
      {filtered.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-slate-500">Nenhuma empresa encontrada para “{term}”.</p>
      ) : (
        <ul ref={listRef} id={listId} role="listbox" aria-label="Empresas" className="min-h-0 flex-1 overflow-y-auto p-1.5">
          {filtered.map((c, i) => {
            const selected = c.id === selectedId
            return (
              <li
                key={c.id}
                id={`${listId}-${c.id}`}
                data-index={i}
                role="option"
                aria-selected={selected}
                onMouseEnter={() => setActive(i)}
                onClick={() => onSelect(c.id)}
                className={cn(
                  'flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5',
                  i === activeIndex ? 'bg-slate-100' : 'hover:bg-slate-50',
                )}
              >
                <Avatar
                  name={c.tradeName || c.legalName}
                  className={cn('h-9 w-9 text-xs', selected ? 'bg-brand-600 text-white' : 'bg-slate-200 text-slate-700')}
                />
                <span className="min-w-0 flex-1">
                  <span className={cn('block truncate text-sm', selected ? 'font-semibold text-brand-800' : 'font-medium text-ink')}>
                    {c.legalName}
                  </span>
                  <span className="block truncate text-xs text-slate-500">
                    {[c.tradeName !== c.legalName ? c.tradeName : null, formatCpfCnpj(c.document), c.nickname]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </span>
                {selected && <Check className="h-4 w-4 shrink-0 text-brand-600" aria-label="Selecionada" />}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

/** Botão + painel flutuante com a lista de empresas. */
function CompanyPickerPopover({ trigger }: { trigger: (props: { open: boolean; toggle: () => void }) => ReactNode }) {
  const { companies, company, setCompany } = useActiveCompany()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: globalThis.KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      {trigger({ open, toggle: () => setOpen((o) => !o) })}
      {open && (
        <div
          role="dialog"
          aria-label="Selecionar empresa"
          className="absolute left-0 z-40 mt-2 flex sm:left-auto sm:right-0 max-h-[min(28rem,70vh)] w-[min(26rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
        >
          <CompanyList
            autoFocus
            companies={companies}
            selectedId={company?.id}
            onSelect={(id) => {
              if (id !== company?.id) setCompany(id)
              setOpen(false)
            }}
          />
        </div>
      )}
    </div>
  )
}

interface CompanyContextBarProps {
  /** Largura do conteúdo, alinhada à da tela (Documentos usa a larga). */
  width?: 'default' | 'wide'
}

/** Faixa no topo da tela: qual empresa está selecionada e como trocar. */
export function CompanyContextBar({ width = 'default' }: CompanyContextBarProps) {
  const { user } = useAuth()
  const { companies, company, isLoading } = useActiveCompany()
  const canSwitch = companies.length > 1
  // No portal do cliente a faixa leva a cor da empresa; o escritório mantém a faixa branca.
  const branded = user?.role === 'Client' && !!company

  return (
    <div
      className={cn(
        'border-b',
        branded
          ? 'relative border-transparent bg-gradient-to-r from-brand-900 via-brand-800 to-brand-700 text-white after:absolute after:inset-x-0 after:bottom-0 after:h-[3px] after:bg-accent'
          : 'border-slate-200 bg-white',
      )}
    >
      <div
        className={cn(
          'mx-auto flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3.5 sm:px-6',
          width === 'wide' ? 'max-w-[1600px]' : 'max-w-7xl',
        )}
      >
        {isLoading ? (
          <Skeleton className="h-11 w-80" />
        ) : company ? (
          <div className="flex min-w-[15rem] flex-1 items-center gap-3">
            <CompanyLogo company={company} className={cn('h-11 w-11', branded && 'border-white/20 shadow-sm')} />
            <div className="min-w-0">
              <p
                className={cn(
                  'text-[11px] font-semibold uppercase tracking-wider',
                  branded ? 'text-white/70' : 'text-brand-700',
                )}
              >
                {branded && user ? `Olá, ${user.name.split(' ')[0]}` : 'Empresa selecionada'}
              </p>
              <p className={cn('truncate text-base font-semibold sm:text-lg', branded ? 'text-white' : 'text-ink')}>
                {company.legalName}
              </p>
              <p className={cn('truncate text-xs', branded ? 'text-white/70' : 'text-slate-500')}>
                {company.document.length === 11 ? 'CPF' : 'CNPJ'} {formatCpfCnpj(company.document)}
                {company.nickname ? ` · ${company.nickname}` : ''}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex min-w-[15rem] flex-1 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-slate-300 text-slate-400">
              <Building2 className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-700">Nenhuma empresa selecionada</p>
              <p className="text-sm text-slate-600">Escolha uma empresa para continuar.</p>
            </div>
          </div>
        )}

        {!isLoading && canSwitch && (
          <CompanyPickerPopover
            trigger={({ open, toggle }) => (
              <Button
                variant={company ? 'secondary' : 'primary'}
                className={cn(branded && 'border-white/30 bg-white/10 text-white hover:bg-white/20')}
                onClick={toggle}
                aria-expanded={open}
                aria-haspopup="dialog"
              >
                {company ? <ArrowLeftRight className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
                {company ? 'Trocar empresa' : 'Selecionar empresa'}
                <ChevronDown className={cn('h-4 w-4 text-current opacity-60 transition-transform', open && 'rotate-180')} />
              </Button>
            )}
          />
        )}
      </div>
    </div>
  )
}

interface CompanyGateProps {
  /** Completa a frase "Escolha a empresa para ...", por exemplo "ver os documentos". */
  purpose: string
  children: (company: Company) => ReactNode
}

/** Só mostra o conteúdo com uma empresa selecionada; antes disso, pede a escolha no próprio lugar. */
export function CompanyGate({ purpose, children }: CompanyGateProps) {
  const { user } = useAuth()
  const { companies, company, isLoading, setCompany } = useActiveCompany()

  if (company) return <>{children(company)}</>
  if (isLoading) return <Spinner className="py-20" />

  if (companies.length === 0) {
    return (
      <EmptyState
        className="py-14"
        icon={<Building2 className="h-6 w-6" />}
        title="Nenhuma empresa disponível"
        description={
          user?.role === 'Client'
            ? 'Seu usuário ainda não foi vinculado a uma empresa. Fale com o escritório contábil.'
            : 'Cadastre uma empresa em Empresas para começar.'
        }
      />
    )
  }

  return (
    <div className="mx-auto max-w-xl py-6">
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
            <Building2 className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-ink">Selecione uma empresa</h2>
            <p className="text-sm text-slate-500">
              Escolha a empresa para {purpose}. Você pode trocar a qualquer momento em “Trocar empresa”, no topo da tela.
            </p>
          </div>
        </div>
        <CompanyList autoFocus companies={companies} onSelect={setCompany} className="max-h-[26rem]" />
      </div>
    </div>
  )
}
