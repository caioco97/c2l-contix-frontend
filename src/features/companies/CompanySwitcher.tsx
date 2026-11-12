import { Building2, Check, ChevronDown } from 'lucide-react'
import { DropdownMenu, MenuItem, Skeleton } from '@/components/ui'
import { formatCnpj } from '@/lib/format'
import { useActiveCompany } from './ActiveCompanyContext'

/** "Empresa: <nome> ▾" — troca a empresa ativa. */
export function CompanySwitcher({ label = 'Empresa' }: { label?: string }) {
  const { companies, company, setCompany, isLoading } = useActiveCompany()

  if (isLoading) return <Skeleton className="h-7 w-64" />
  if (!company) return null

  const canSwitch = companies.length > 1

  return (
    <DropdownMenu
      align="left"
      trigger={({ toggle, open }) => (
        <button
          type="button"
          onClick={canSwitch ? toggle : undefined}
          aria-expanded={open}
          aria-haspopup={canSwitch ? 'menu' : undefined}
          className="group flex items-center gap-2 text-left"
        >
          <span className="truncate text-lg font-semibold text-ink sm:text-xl">
            {label ? `${label}: ` : ''}
            {company.legalName}
          </span>
          {canSwitch && (
            <ChevronDown className="h-5 w-5 text-slate-500 transition-transform group-aria-expanded:rotate-180" />
          )}
        </button>
      )}
    >
      {(close) =>
        companies.map((c) => (
          <MenuItem
            key={c.id}
            active={c.id === company.id}
            icon={c.id === company.id ? <Check className="h-4 w-4 text-brand-600" /> : <Building2 className="h-4 w-4" />}
            onClick={() => {
              setCompany(c.id)
              close()
            }}
          >
            <span className="flex flex-col">
              <span>{c.legalName}</span>
              <span className="text-xs text-slate-500">{formatCnpj(c.document)}</span>
            </span>
          </MenuItem>
        ))
      }
    </DropdownMenu>
  )
}
