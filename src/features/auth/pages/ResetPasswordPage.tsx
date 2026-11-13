import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Button, FormField, Input, useToast } from '@/components/ui'
import { getErrorMessage } from '@/lib/api'
import { authApi } from '../api'
import { AuthLayout } from '../components/AuthLayout'
import { resetPasswordSchema, type ResetPasswordForm } from '../schemas'

export function ResetPasswordPage() {
  const [params] = useSearchParams()
  const token = params.get('token')
  // Link do convite de primeiro acesso: mesma troca de senha, com textos de boas-vindas.
  const invite = params.get('convite') === '1'
  const navigate = useNavigate()
  const toast = useToast()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordForm>({ resolver: zodResolver(resetPasswordSchema) })

  if (!token) {
    return (
      <AuthLayout title="Link inválido" subtitle={`O link ${invite ? 'do convite' : 'de redefinição'} está incompleto ou expirou.`}>
        <Link to="/esqueci-senha" className="text-sm font-medium text-brand-700 hover:underline">
          Solicitar um novo link
        </Link>
      </AuthLayout>
    )
  }

  const onSubmit = handleSubmit(async ({ password }) => {
    setServerError(null)
    try {
      await authApi.resetPassword({ token, password })
      toast.success(invite ? 'Senha criada. Entre com o seu e-mail e a nova senha.' : 'Senha alterada. Entre com a nova senha.')
      navigate('/login', { replace: true })
    } catch (error) {
      setServerError(getErrorMessage(error, invite ? 'Não foi possível criar a senha.' : 'Não foi possível redefinir a senha.'))
    }
  })

  return (
    <AuthLayout
      title={invite ? 'Boas-vindas ao Contix' : 'Criar nova senha'}
      subtitle={
        invite
          ? 'Crie a sua senha de acesso. Use pelo menos 8 caracteres, com letras maiúsculas, minúsculas e um número.'
          : 'Use pelo menos 8 caracteres, com letras maiúsculas, minúsculas e um número.'
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        {serverError && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {serverError}{' '}
            <Link to="/esqueci-senha" className="font-medium underline">
              Solicitar um novo link
            </Link>
          </div>
        )}
        <FormField label="Nova senha" htmlFor="password" error={errors.password?.message}>
          <Input id="password" type="password" autoComplete="new-password" invalid={!!errors.password} {...register('password')} />
        </FormField>
        <FormField label="Confirmar senha" htmlFor="confirmPassword" error={errors.confirmPassword?.message}>
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            invalid={!!errors.confirmPassword}
            {...register('confirmPassword')}
          />
        </FormField>
        <Button type="submit" size="lg" className="w-full justify-center" loading={isSubmitting}>
          {invite ? 'Criar minha senha' : 'Salvar nova senha'}
        </Button>
      </form>
    </AuthLayout>
  )
}
