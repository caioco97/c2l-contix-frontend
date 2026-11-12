import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router-dom'
import { ArrowLeft, MailCheck, Mail } from 'lucide-react'
import { Button, FormField, Input } from '@/components/ui'
import { authApi } from '../api'
import { AuthLayout } from '../components/AuthLayout'
import { forgotPasswordSchema, type ForgotPasswordForm } from '../schemas'

export function ForgotPasswordPage() {
  const [sentTo, setSentTo] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordForm>({ resolver: zodResolver(forgotPasswordSchema) })

  const onSubmit = handleSubmit(async ({ email }) => {
    // Resposta neutra: mostramos a mesma mensagem mesmo se a API falhar,
    // para não revelar se o e-mail existe.
    await authApi.forgotPassword(email).catch(() => undefined)
    setSentTo(email)
  })

  if (sentTo) {
    return (
      <AuthLayout title="Verifique seu e-mail">
        <div className="space-y-6">
          <div className="flex items-start gap-3 rounded-lg bg-brand-50 p-4 text-sm text-brand-900">
            <MailCheck className="h-5 w-5 shrink-0 text-brand-600" />
            <p>
              Se existir uma conta para <strong>{sentTo}</strong>, você receberá um link para criar uma nova senha. O link
              vale por 1 hora.
            </p>
          </div>
          <BackToLogin />
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Esqueceu a senha?" subtitle="Informe seu e-mail e enviaremos um link para redefini-la.">
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <FormField label="E-mail" htmlFor="email" error={errors.email?.message}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            leftIcon={<Mail className="h-4 w-4" />}
            invalid={!!errors.email}
            {...register('email')}
          />
        </FormField>
        <Button type="submit" size="lg" className="w-full justify-center" loading={isSubmitting}>
          Enviar link
        </Button>
        <BackToLogin />
      </form>
    </AuthLayout>
  )
}

function BackToLogin() {
  return (
    <Link to="/login" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline">
      <ArrowLeft className="h-4 w-4" />
      Voltar para o login
    </Link>
  )
}
