import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, FileKey2, KeyRound, RefreshCw, Trash2, Upload } from 'lucide-react'
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Checkbox,
  ConfirmModal,
  FormField,
  Input,
  Modal,
  Skeleton,
  useToast,
} from '@/components/ui'
import { getErrorMessage } from '@/lib/api'
import { formatCnpj } from '@/lib/br'
import { formatDate, formatDateTime } from '@/lib/format'
import { nfeApi, nfeKeys } from '../api'
import type { SefazIntegration } from '../types'

/** Certificado A1 e busca automática de NF-e na SEFAZ de uma empresa (escritório). */
export function SefazIntegrationCard({ companyId }: { companyId: string }) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [uploading, setUploading] = useState(false)
  const [removing, setRemoving] = useState(false)
  const { data: s, isLoading } = useQuery({ queryKey: nfeKeys.sefaz(companyId), queryFn: () => nfeApi.sefaz(companyId) })

  const onSaved = (data: SefazIntegration) => {
    queryClient.setQueryData(nfeKeys.sefaz(companyId), data)
    queryClient.invalidateQueries({ queryKey: nfeKeys.all })
  }

  const save = useMutation({
    mutationFn: (input: { active: boolean; autoAcknowledge: boolean }) => nfeApi.saveSefaz(companyId, input),
    onSuccess: (d) => {
      onSaved(d)
      toast.success(d.active ? 'Busca automática ligada.' : 'Busca automática desligada.')
    },
    onError: (e) => toast.error(getErrorMessage(e, 'Não foi possível salvar.')),
  })
  const sync = useMutation({
    mutationFn: () => nfeApi.syncNow(companyId),
    onSuccess: (d) => {
      onSaved(d)
      toast.success('Busca agendada. As notas aparecem em alguns minutos.')
    },
    onError: (e) => toast.error(getErrorMessage(e, 'Não foi possível buscar agora.')),
  })
  const remove = useMutation({
    mutationFn: () => nfeApi.removeCertificate(companyId),
    onSuccess: (d) => {
      onSaved(d)
      setRemoving(false)
      toast.success('Certificado removido.')
    },
    onError: (e) => toast.error(getErrorMessage(e, 'Não foi possível remover o certificado.')),
  })

  if (isLoading || !s) return <Skeleton className="h-64" />

  if (!s.integrationEnabled)
    return (
      <Card>
        <CardBody className="flex items-start gap-3 text-sm text-slate-600">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
          A integração com a SEFAZ não está configurada neste ambiente. As notas podem ser importadas por XML na tela de NF-e.
        </CardBody>
      </Card>
    )

  const cert = s.certificate
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader
          title="Certificado digital A1"
          icon={<FileKey2 className="h-5 w-5" />}
          action={
            cert && (
              <Button variant="ghost" size="sm" onClick={() => setRemoving(true)}>
                <Trash2 className="h-4 w-4" /> Remover
              </Button>
            )
          }
        />
        <CardBody className="space-y-3 text-sm">
          {cert ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-ink">{cert.holder}</span>
                {cert.expired ? (
                  <Badge tone="danger">Vencido</Badge>
                ) : cert.daysToExpire <= 30 ? (
                  <Badge tone="warning">Vence em {cert.daysToExpire} dias</Badge>
                ) : (
                  <Badge tone="success">Válido</Badge>
                )}
              </div>
              <dl className="grid grid-cols-2 gap-2 text-slate-600">
                <Info label="CNPJ" value={cert.cnpj ? formatCnpj(cert.cnpj) : '—'} />
                <Info label="Validade" value={`${formatDate(cert.validFrom)} a ${formatDate(cert.validUntil)}`} />
                <Info label="Emissor" value={cert.issuer} />
                <Info label="Enviado" value={`${formatDate(cert.uploadedAt)}${cert.uploadedBy ? ` por ${cert.uploadedBy}` : ''}`} />
              </dl>
              <Button variant="secondary" size="sm" onClick={() => setUploading(true)}>
                <Upload className="h-4 w-4" /> Substituir certificado
              </Button>
            </>
          ) : (
            <>
              <p className="text-slate-600">
                Envie o certificado e-CNPJ A1 (.pfx) da empresa. Ele é usado para buscar as NF-e na SEFAZ e registrar as
                manifestações. O arquivo e a senha ficam guardados com criptografia.
              </p>
              <Button size="sm" onClick={() => setUploading(true)}>
                <Upload className="h-4 w-4" /> Enviar certificado
              </Button>
            </>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Busca automática na SEFAZ"
          icon={<RefreshCw className="h-5 w-5" />}
          action={s.environment && <Badge tone={s.environment === 'Producao' ? 'brand' : 'neutral'}>{s.environment === 'Producao' ? 'Produção' : 'Homologação'}</Badge>}
        />
        <CardBody className="space-y-3 text-sm">
          <label className="flex items-start gap-2">
            <Checkbox
              className="mt-0.5"
              checked={s.active}
              disabled={save.isPending || (!s.active && s.pending.length > 0)}
              onChange={(e) => save.mutate({ active: e.target.checked, autoAcknowledge: s.autoAcknowledge })}
            />
            <span>
              <span className="block font-medium text-ink">Buscar NF-e emitidas contra o CNPJ</span>
              <span className="block text-xs text-slate-500">
                Consulta a Distribuição DF-e periodicamente e coloca as notas novas na lista de NF-e da empresa.
              </span>
            </span>
          </label>
          <label className="flex items-start gap-2">
            <Checkbox
              className="mt-0.5"
              checked={s.autoAcknowledge}
              disabled={save.isPending}
              onChange={(e) => save.mutate({ active: s.active, autoAcknowledge: e.target.checked })}
            />
            <span>
              <span className="block font-medium text-ink">Dar ciência automática nas notas novas</span>
              <span className="block text-xs text-slate-500">
                A SEFAZ só libera o XML completo depois da ciência. Confirmação e desconhecimento continuam com o cliente.
              </span>
            </span>
          </label>

          {s.pending.length > 0 && (
            <ul className="space-y-1 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
              {s.pending.map((p) => (
                <li key={p} className="flex gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {p}
                </li>
              ))}
            </ul>
          )}

          {s.lastQueryAt && (
            <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
              <p className="flex items-center gap-1.5 font-medium text-slate-700">
                {s.lastQueryFailed ? (
                  <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                )}
                Última consulta em {formatDateTime(s.lastQueryAt)}
              </p>
              {s.lastMessage && (
                <p className="mt-1">
                  {s.lastStatus && `${s.lastStatus} · `}
                  {s.lastMessage}
                </p>
              )}
              <p className="mt-1">
                {s.documentsReceived} documento(s) recebido(s) · NSU {s.lastNsu}
                {s.nextQueryAt && ` · próxima consulta ${formatDateTime(s.nextQueryAt)}`}
              </p>
            </div>
          )}

          {s.active && (
            <Button variant="secondary" size="sm" onClick={() => sync.mutate()} loading={sync.isPending}>
              <RefreshCw className="h-4 w-4" /> Buscar agora
            </Button>
          )}
        </CardBody>
      </Card>

      <CertificateModal
        open={uploading}
        replacing={!!cert}
        onClose={() => setUploading(false)}
        onSubmit={async (file, password) => {
          try {
            onSaved(await nfeApi.uploadCertificate(companyId, file, password))
            toast.success('Certificado salvo.')
            setUploading(false)
          } catch (e) {
            toast.error(getErrorMessage(e, 'Não foi possível salvar o certificado.'))
          }
        }}
      />
      <ConfirmModal
        open={removing}
        title="Remover certificado?"
        description="A busca automática será desligada e as próximas manifestações ficam registradas só no Contix até um novo certificado ser enviado."
        confirmLabel="Remover"
        loading={remove.isPending}
        onConfirm={() => remove.mutate()}
        onClose={() => setRemoving(false)}
      />
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="break-words text-ink">{value}</dd>
    </div>
  )
}

function CertificateModal({
  open,
  replacing,
  onClose,
  onSubmit,
}: {
  open: boolean
  replacing: boolean
  onClose: () => void
  onSubmit: (file: File, password: string) => Promise<void>
}) {
  const [file, setFile] = useState<File | null>(null)
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)

  const close = () => {
    setFile(null)
    setPassword('')
    onClose()
  }

  const submit = async () => {
    if (!file || !password) return
    setSaving(true)
    await onSubmit(file, password)
    setSaving(false)
    setPassword('')
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title={replacing ? 'Substituir certificado A1' : 'Enviar certificado A1'}
      description="Certificado e-CNPJ do tipo A1 (.pfx ou .p12) da própria empresa ou da matriz."
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Cancelar
          </Button>
          <Button onClick={submit} loading={saving} disabled={!file || !password}>
            <KeyRound className="h-4 w-4" /> Salvar certificado
          </Button>
        </>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <FormField label="Arquivo do certificado" htmlFor="cert-file" required>
          <Input id="cert-file" type="file" accept=".pfx,.p12" className="pt-2" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </FormField>
        <FormField label="Senha do certificado" htmlFor="cert-password" required hint="A senha é guardada com criptografia e nunca é exibida.">
          <Input id="cert-password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </FormField>
        <button type="submit" hidden />
      </form>
    </Modal>
  )
}
