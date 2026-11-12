import type { NewsAudience, NewsStatus, TaxRegime } from '@/types/domain'

export const NEWS_STATUS: Record<NewsStatus, { label: string; tone: 'success' | 'info' | 'neutral' }> = {
  Publicada: { label: 'Publicada', tone: 'success' },
  Agendada: { label: 'Agendada', tone: 'info' },
  Expirada: { label: 'Expirada', tone: 'neutral' },
}

export const NEWS_AUDIENCES: { value: NewsAudience; label: string }[] = [
  { value: 'Todos', label: 'Todas as empresas' },
  { value: 'EmpresasSelecionadas', label: 'Empresas selecionadas' },
  { value: 'RegimeTributario', label: 'Por regime tributário' },
]

export const TAX_REGIMES: { value: TaxRegime; label: string }[] = [
  { value: 'SimplesNacional', label: 'Simples Nacional' },
  { value: 'MEI', label: 'MEI' },
  { value: 'LucroPresumido', label: 'Lucro Presumido' },
  { value: 'LucroReal', label: 'Lucro Real' },
  { value: 'Imune', label: 'Imune' },
  { value: 'Isento', label: 'Isento' },
  { value: 'Outro', label: 'Outro' },
]
