import {
  Briefcase,
  Calculator,
  CalendarClock,
  ClipboardList,
  FileBarChart2,
  FileSignature,
  FileX2,
  GraduationCap,
  HeartPulse,
  ReceiptText,
  UserPlus,
  type LucideIcon,
} from 'lucide-react'
import type { ServiceRequestStatus } from '@/types/domain'

export const requestIcons: Record<string, LucideIcon> = {
  general: ClipboardList,
  employee: UserPlus,
  taxpayer: Briefcase,
  intern: GraduationCap,
  'vacation-notice': CalendarClock,
  'vacation-calc': Calculator,
  'termination-notice': FileX2,
  'termination-calc': FileBarChart2,
  leave: HeartPulse,
  'payroll-items': FileSignature,
  nfe: ReceiptText,
}

export const statusMeta: Record<
  ServiceRequestStatus,
  { label: string; tone: 'info' | 'warning' | 'success' | 'neutral' | 'brand' }
> = {
  Open: { label: 'Aberta', tone: 'info' },
  InAnalysis: { label: 'Em análise', tone: 'brand' },
  WaitingClient: { label: 'Aguardando você', tone: 'warning' },
  Done: { label: 'Concluída', tone: 'success' },
  Canceled: { label: 'Cancelada', tone: 'neutral' },
}

export const DEPARTMENTS = ['Contábil', 'Fiscal', 'Pessoal', 'Societário', 'Financeiro'].map((d) => ({ value: d, label: d }))
