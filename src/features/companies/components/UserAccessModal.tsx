import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Folder } from 'lucide-react'
import { Button, Checkbox, FormField, Input, Modal, Skeleton } from '@/components/ui'
import { documentKeys, documentsApi } from '@/features/documents/api'
import { cn } from '@/lib/cn'
import type { PortalModule, PortalPermissions, PortalUser } from '@/types/domain'
import { PORTAL_MODULES } from '../meta'

const ALL_MODULES = PORTAL_MODULES.map((m) => m.value)
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface Props {
  open: boolean
  companyId: string
  companyName: string
  /** Usuário em edição; sem ele, o modal convida um novo. */
  user?: PortalUser | null
  onClose: () => void
  onInvite: (input: { name: string; email: string } & PortalPermissions) => Promise<void>
  onSave: (p: PortalPermissions) => Promise<void>
}

/** Convite de usuário do portal ou edição das permissões dele nesta empresa (módulos e pastas). */
export function UserAccessModal({ open, companyId, companyName, user, onClose, onInvite, onSave }: Props) {
  // O estado nasce do usuário; quem abre o modal troca a `key` para recomeçar.
  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [modules, setModules] = useState<PortalModule[]>(user?.modules ?? ALL_MODULES)
  const [allFolders, setAllFolders] = useState(user?.allFolders ?? true)
  const [folderIds, setFolderIds] = useState<string[]>(user?.folderIds ?? [])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const folders = useQuery({
    queryKey: documentKeys.folders(companyId),
    queryFn: () => documentsApi.folders(companyId),
    enabled: open,
  })

  const toggle = <T,>(list: T[], value: T) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value])
  const documents = modules.includes('Documentos')

  const submit = async () => {
    const e: Record<string, string> = {}
    if (!user) {
      if (!name.trim()) e.name = 'Informe o nome.'
      if (!EMAIL.test(email.trim())) e.email = 'Informe um e-mail válido.'
    }
    if (documents && !allFolders && folderIds.length === 0) e.folders = 'Selecione ao menos uma pasta ou libere todas.'
    setErrors(e)
    if (Object.keys(e).length) return

    const permissions = { modules, allFolders, folderIds: allFolders ? [] : folderIds }
    setSaving(true)
    try {
      if (user) await onSave(permissions)
      else await onInvite({ name: name.trim(), email: email.trim(), ...permissions })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={user ? `Acesso de ${user.name}` : 'Convidar usuário'}
      description={
        user
          ? `Permissões na empresa ${companyName}.`
          : `O usuário recebe um e-mail para criar a senha e acessar o portal da empresa ${companyName}.`
      }
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={submit} loading={saving}>
            {user ? 'Salvar permissões' : 'Enviar convite'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {!user && (
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Nome" htmlFor="invite-name" error={errors.name} required>
              <Input id="invite-name" value={name} invalid={!!errors.name} onChange={(e) => setName(e.target.value)} />
            </FormField>
            <FormField
              label="E-mail"
              htmlFor="invite-email"
              error={errors.email}
              hint="Se a pessoa já acessa outra empresa do escritório, ela só ganha acesso a esta."
              required
            >
              <Input
                id="invite-email"
                type="email"
                value={email}
                invalid={!!errors.email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </FormField>
          </div>
        )}

        <fieldset className="space-y-2">
          <legend className="mb-1 text-sm font-semibold text-slate-700">Módulos do portal</legend>
          {PORTAL_MODULES.map((m) => (
            <label key={m.value} className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 px-3 py-2 hover:bg-slate-50">
              <Checkbox className="mt-0.5" checked={modules.includes(m.value)} onChange={() => setModules(toggle(modules, m.value))} />
              <span>
                <span className="block text-sm font-medium text-ink">{m.label}</span>
                <span className="block text-xs text-slate-500">{m.description}</span>
              </span>
            </label>
          ))}
          <p className="text-xs text-slate-500">Início, notícias e certidões ficam sempre visíveis.</p>
        </fieldset>

        <fieldset disabled={!documents} className={cn('space-y-2', !documents && 'opacity-50')}>
          <legend className="mb-1 text-sm font-semibold text-slate-700">Pastas de documentos</legend>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="radio" name="folders" checked={allFolders} onChange={() => setAllFolders(true)} className="accent-brand-600" />
            Todas as pastas
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="radio" name="folders" checked={!allFolders} onChange={() => setAllFolders(false)} className="accent-brand-600" />
            Somente as pastas selecionadas (com as subpastas)
          </label>
          {!allFolders && (
            <div className="grid gap-2 pl-6 sm:grid-cols-2">
              {folders.isLoading
                ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-9" />)
                : (folders.data ?? []).map((f) => (
                    <label key={f.id} className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50">
                      <Checkbox checked={folderIds.includes(f.id)} onChange={() => setFolderIds(toggle(folderIds, f.id))} />
                      <Folder className="h-4 w-4 text-slate-400" />
                      {f.name}
                    </label>
                  ))}
            </div>
          )}
          {errors.folders && <p className="text-xs text-red-600">{errors.folders}</p>}
        </fieldset>
      </div>
    </Modal>
  )
}
