import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Lock, Mail } from 'lucide-react'
import { Button, Checkbox, FormField, Input } from '@/components/ui'
import { env } from '@/config/env'
import { getErrorMessage } from '@/lib/api'
import { useAuth } from '../AuthContext'
import { AuthLayout } from '../components/AuthLayout'
import { loginSchema, type LoginForm } from '../schemas'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [showPassword, setShowPassword] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: env.useMocks ? 'demo@contix.com.br' : '', password: '', remember: true },
  })

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setServerError(null)
    try {
      await login({ email, password })
      const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/'
      navigate(from, { replace: true })
    } catch (error) {
      setServerError(getErrorMessage(error, 'Não foi possível entrar.'))
    }
  })

  return (
    <AuthLayout title="Entrar" subtitle="Acesse o portal do seu escritório contábil.">
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        {serverError && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {serverError}
          </div>
        )}

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

        <FormField label="Senha" htmlFor="password" error={errors.password?.message}>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              leftIcon={<Lock className="h-4 w-4" />}
              invalid={!!errors.password}
              className="pr-10"
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-ink"
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </FormField>

        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 text-slate-600">
            <Checkbox {...register('remember')} />
            Manter conectado
          </label>
          <Link to="/esqueci-senha" className="font-medium text-brand-700 hover:underline">
            Esqueci minha senha
          </Link>
        </div>

        <Button type="submit" size="lg" className="w-full justify-center" loading={isSubmitting}>
          Entrar
        </Button>

        {env.useMocks && (
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-center text-xs text-slate-500">
            Modo demonstração: use qualquer e-mail e a senha <strong>123456</strong>.
          </p>
        )}
      </form>
    </AuthLayout>
  )
}
