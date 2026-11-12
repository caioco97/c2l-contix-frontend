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
      <AuthLayout title="Link inválido" subtitle="O link de redefinição está incompleto ou expirou.">
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
      toast.success('Senha alterada. Entre com a nova senha.')
      navigate('/login', { replace: true })
    } catch (error) {
      setServerError(getErrorMessage(error, 'Não foi possível redefinir a senha.'))
    }
  })

  return (
    <AuthLayout title="Criar nova senha" subtitle="Use pelo menos 8 caracteres, com uma letra maiúscula e um número.">
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        {serverError && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {serverError}
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
          Salvar nova senha
        </Button>
      </form>
    </AuthLayout>
  )
}
