import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { Building2, Camera, KeyRound, Trash2, UserRound } from 'lucide-react'
import { z } from 'zod'
import { Badge, Button, Card, CardBody, CardHeader, FormField, Input, MaskedInput, useToast } from '@/components/ui'
import { useAuth } from '@/features/auth/AuthContext'
import { resetPasswordSchema } from '@/features/auth/schemas'
import { getErrorMessage } from '@/lib/api'
import { formatPhone } from '@/lib/br'
import { br } from '@/lib/zodBr'
import type { CurrentUser, UserRole } from '@/types/auth'
import { MAX_PHOTO, PHOTO_TYPES, profileApi } from './api'
import { UserAvatar } from './components/UserAvatar'

const ROLE_LABEL: Record<UserRole, string> = {
  Admin: 'Administrador',
  Collaborator: 'Colaborador',
  Client: 'Cliente',
}

const profileSchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome.').max(150, 'Máximo de 150 caracteres.'),
  email: z.string().trim().min(1, 'Informe o e-mail.').email('E-mail inválido.'),
  phone: br.telefone(),
})
type ProfileForm = z.infer<typeof profileSchema>

const passwordSchema = z
  .object({ currentPassword: z.string().min(1, 'Informe a senha atual.') })
  .and(resetPasswordSchema)
  .refine((v) => v.password !== v.currentPassword, {
    path: ['password'],
    message: 'A nova senha deve ser diferente da atual.',
  })
type PasswordForm = z.infer<typeof passwordSchema>

/** Meu perfil (CTX-117): dados de contato, foto e senha do usuário logado. */
export function ProfilePage() {
  const { user } = useAuth()
  if (!user) return null

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">Meu perfil</h1>
        <p className="text-sm text-slate-500">Seus dados de acesso ao Contix.</p>
      </div>
      <PhotoCard user={user} />
      <DetailsCard user={user} />
      <PasswordCard />
    </div>
  )
}

function PhotoCard({ user }: { user: CurrentUser }) {
  const { updateUser } = useAuth()
  const toast = useToast()
  const fileRef = useRef<HTMLInputElement>(null)

  const upload = useMutation({
    mutationFn: profileApi.uploadPhoto,
    onSuccess: (me) => {
      updateUser(me)
      toast.success('Foto atualizada.')
    },
    onError: (e) => toast.error(getErrorMessage(e, 'Não foi possível enviar a foto.')),
  })
  const remove = useMutation({
    mutationFn: profileApi.removePhoto,
    onSuccess: (me) => {
      updateUser(me)
      toast.success('Foto removida.')
    },
    onError: (e) => toast.error(getErrorMessage(e, 'Não foi possível remover a foto.')),
  })

  const onFile = (file: File | undefined) => {
    if (fileRef.current) fileRef.current.value = ''
    if (!file) return
    if (!PHOTO_TYPES.includes(file.type)) return toast.error('Envie a foto em PNG, JPG ou WEBP.')
    if (file.size > MAX_PHOTO) return toast.error('A foto deve ter até 1 MB.')
    upload.mutate(file)
  }

  return (
    <Card>
      <CardBody className="flex flex-col items-center gap-5 sm:flex-row">
        <UserAvatar user={user} className="h-20 w-20 text-2xl" />
        <div className="min-w-0 flex-1 text-center sm:text-left">
          <p className="truncate text-lg font-semibold text-ink">{user.name}</p>
          <p className="truncate text-sm text-slate-500">{user.email}</p>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <Badge tone="brand">{ROLE_LABEL[user.role]}</Badge>
            <span className="inline-flex items-center gap-1 text-xs text-slate-500">
              <Building2 className="h-3.5 w-3.5" />
              {user.office.name}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-center gap-2 sm:items-end">
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" loading={upload.isPending} onClick={() => fileRef.current?.click()}>
              <Camera className="h-4 w-4" />
              {user.photoVersion ? 'Trocar foto' : 'Enviar foto'}
            </Button>
            {user.photoVersion && (
              <Button
                variant="ghost"
                size="sm"
                loading={remove.isPending}
                onClick={() => remove.mutate()}
                aria-label="Remover foto"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
          <p className="text-xs text-slate-500">PNG, JPG ou WEBP, até 1 MB.</p>
          <input
            ref={fileRef}
            type="file"
            accept={PHOTO_TYPES.join(',')}
            className="hidden"
            aria-label="Foto de perfil"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
        </div>
      </CardBody>
    </Card>
  )
}

function DetailsCard({ user }: { user: CurrentUser }) {
  const { updateUser } = useAuth()
  const toast = useToast()
  const [serverError, setServerError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    values: { name: user.name, email: user.email, phone: formatPhone(user.phone) },
    resetOptions: { keepDirtyValues: true },
  })

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null)
    try {
      const me = await profileApi.update(values)
      updateUser(me)
      reset({ name: me.name, email: me.email, phone: formatPhone(me.phone) })
      toast.success('Dados atualizados.')
    } catch (error) {
      setServerError(getErrorMessage(error, 'Não foi possível salvar os dados.'))
    }
  })

  return (
    <Card>
      <CardHeader title="Dados pessoais" icon={<UserRound className="h-5 w-5" />} />
      <CardBody>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          {serverError && (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {serverError}
            </div>
          )}
          <FormField label="Nome" htmlFor="profile-name" error={errors.name?.message} required>
            <Input id="profile-name" autoComplete="name" invalid={!!errors.name} {...register('name')} />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="E-mail"
              htmlFor="profile-email"
              error={errors.email?.message}
              hint="É o e-mail que você usa para entrar."
              required
            >
              <Input id="profile-email" type="email" autoComplete="email" invalid={!!errors.email} {...register('email')} />
            </FormField>
            <FormField label="Telefone" htmlFor="profile-phone" error={errors.phone?.message}>
              <MaskedInput id="profile-phone" mask="phone" invalid={!!errors.phone} {...register('phone')} />
            </FormField>
          </div>
          <div className="flex justify-end">
            <Button type="submit" loading={isSubmitting} disabled={!isDirty}>
              Salvar dados
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  )
}

function PasswordCard() {
  const { replaceSession } = useAuth()
  const toast = useToast()
  const [serverError, setServerError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', password: '', confirmPassword: '' },
  })

  const onSubmit = handleSubmit(async ({ currentPassword, password }) => {
    setServerError(null)
    try {
      const { tokens, user } = await profileApi.changePassword({ currentPassword, newPassword: password })
      replaceSession(tokens, user)
      reset()
      toast.success('Senha alterada. As outras sessões abertas foram encerradas.')
    } catch (error) {
      setServerError(getErrorMessage(error, 'Não foi possível alterar a senha.'))
    }
  })

  return (
    <Card>
      <CardHeader title="Trocar senha" icon={<KeyRound className="h-5 w-5" />} />
      <CardBody>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <p className="text-sm text-slate-500">
            Use pelo menos 8 caracteres, com letras maiúsculas, minúsculas e um número. Ao trocar a senha, as outras
            sessões abertas (inclusive no aplicativo) são encerradas.
          </p>
          {serverError && (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {serverError}
            </div>
          )}
          <FormField label="Senha atual" htmlFor="current-password" error={errors.currentPassword?.message} required>
            <Input
              id="current-password"
              type="password"
              autoComplete="current-password"
              invalid={!!errors.currentPassword}
              {...register('currentPassword')}
            />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Nova senha" htmlFor="new-password" error={errors.password?.message} required>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                invalid={!!errors.password}
                {...register('password')}
              />
            </FormField>
            <FormField label="Confirmar nova senha" htmlFor="confirm-password" error={errors.confirmPassword?.message} required>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                invalid={!!errors.confirmPassword}
                {...register('confirmPassword')}
              />
            </FormField>
          </div>
          <div className="flex justify-end">
            <Button type="submit" loading={isSubmitting}>
              Alterar senha
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  )
}
