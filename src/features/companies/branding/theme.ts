/*
 * Tema do portal por empresa. O Tailwind gera as classes brand-* a partir das variáveis
 * --color-brand-50 … --color-brand-950 (index.css). Para aplicar a cor da empresa basta
 * redefinir essas variáveis: a escala é derivada da cor principal, que fica no tom 600
 * (o usado em botões, links e destaques).
 */

export const DEFAULT_PRIMARY = '#167f74'
export const DEFAULT_SECONDARY = '#42baa8'

const HEX = /^#[0-9a-f]{6}$/i

export const isHexColor = (v: string | null | undefined): v is string => !!v && HEX.test(v)

/** Mistura em oklab com branco (tons claros) ou preto (tons escuros). */
const tint = (hex: string, pct: number) => `color-mix(in oklab, ${hex} ${pct}%, white)`
const shade = (hex: string, pct: number) => `color-mix(in oklab, ${hex} ${100 - pct}%, black)`

/** Variáveis CSS da escala brand a partir da cor principal. */
export function brandScale(primary: string): Record<string, string> {
  return {
    '--color-brand-50': tint(primary, 7),
    '--color-brand-100': tint(primary, 14),
    '--color-brand-200': tint(primary, 28),
    '--color-brand-300': tint(primary, 48),
    '--color-brand-400': tint(primary, 72),
    '--color-brand-500': tint(primary, 88),
    '--color-brand-600': primary,
    '--color-brand-700': shade(primary, 15),
    '--color-brand-800': shade(primary, 30),
    '--color-brand-900': shade(primary, 45),
    '--color-brand-950': shade(primary, 65),
  }
}

/** Variáveis do tema completo de uma empresa (vazio quando ela usa o padrão). */
export function themeVars(
  primary: string | null | undefined,
  secondary: string | null | undefined,
): Record<string, string> {
  return {
    ...(isHexColor(primary) ? brandScale(primary) : {}),
    ...(isHexColor(secondary) ? { '--color-accent': secondary } : {}),
  }
}

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** Contraste (WCAG) do texto branco sobre a cor: abaixo de 3, botões e destaques ficam ilegíveis. */
export const contrastWithWhite = (hex: string) => 1.05 / (luminance(hex) + 0.05)
