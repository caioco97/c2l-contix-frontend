import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().trim().min(1, 'Informe seu e-mail.').email('E-mail inválido.'),
  password: z.string().min(1, 'Informe sua senha.'),
  remember: z.boolean(),
})
export type LoginForm = z.infer<typeof loginSchema>

export const forgotPasswordSchema = z.object({
  email: z.string().trim().min(1, 'Informe seu e-mail.').email('E-mail inválido.'),
})
export type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'A senha deve ter pelo menos 8 caracteres.')
      .regex(/[A-Z]/, 'Inclua pelo menos uma letra maiúscula.')
      .regex(/[a-z]/, 'Inclua pelo menos uma letra minúscula.')
      .regex(/[0-9]/, 'Inclua pelo menos um número.'),
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'As senhas não conferem.',
  })
export type ResetPasswordForm = z.infer<typeof resetPasswordSchema>
