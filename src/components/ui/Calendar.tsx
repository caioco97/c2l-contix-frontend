import { useMemo } from 'react'
import {
  addDays,
  addMonths,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Button } from './Button'

interface CalendarProps {
  month: Date
  onMonthChange: (month: Date) => void
  selected: Date | null
  onSelect: (day: Date) => void
  /** Dias que recebem um marcador (ex.: vencimentos). */
  markedDays?: Date[]
}

const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

export function Calendar({ month, onMonthChange, selected, onSelect, markedDays = [] }: CalendarProps) {
  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 0 })
    return Array.from({ length: 42 }, (_, i) => addDays(start, i))
  }, [month])

  const label = format(month, 'MMMM', { locale: ptBR })

  return (
    <div className="select-none">
      <div className="mb-3 flex items-center justify-between">
        <Button variant="secondary" size="icon" onClick={() => onMonthChange(addMonths(month, -1))} aria-label="Mês anterior">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-center leading-tight">
          <div className="text-base font-semibold capitalize text-ink">{label}</div>
          <div className="text-xs text-slate-500">{format(month, 'yyyy')}</div>
        </div>
        <Button variant="secondary" size="icon" onClick={() => onMonthChange(addMonths(month, 1))} aria-label="Próximo mês">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 text-center text-xs font-medium text-slate-400">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-1.5">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1 text-center text-sm">
        {days.map((day) => {
          const inMonth = isSameMonth(day, month)
          const isSelected = selected ? isSameDay(day, selected) : false
          const marked = markedDays.some((d) => isSameDay(d, day))
          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onSelect(day)}
              aria-pressed={isSelected}
              aria-label={format(day, "d 'de' MMMM", { locale: ptBR }) + (marked ? ', com vencimento' : '')}
              className={cn(
                'relative mx-auto flex h-9 w-9 flex-col items-center justify-center rounded-lg transition-colors',
                inMonth ? 'text-ink hover:bg-slate-100' : 'text-slate-300 hover:bg-slate-50',
                isToday(day) && !isSelected && 'font-semibold text-brand-700 ring-1 ring-brand-300',
                isSelected && 'bg-brand-600 font-semibold text-white hover:bg-brand-600',
              )}
            >
              {format(day, 'd')}
              {marked && (
                <span
                  className={cn(
                    'absolute bottom-1 h-1 w-1 rounded-full',
                    isSelected ? 'bg-white' : 'bg-amber-500',
                  )}
                />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
