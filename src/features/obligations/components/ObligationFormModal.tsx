import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button, Checkbox, FormField, Input, Modal, Select, Textarea } from '@/components/ui'
import { requestKeys, requestsApi } from '@/features/requests/api'
import { DEPARTMENTS } from '@/features/requests/meta'
import { TAX_REGIMES } from '@/features/news/meta'
import type { TaxRegime } from '@/types/domain'
import { describeSchedule, MONTHS, PERIODICITY_OPTIONS, type Obligation, type ObligationInput } from '../api'

interface Props {
  open: boolean
  obligation: Obligation | null
  saving: boolean
  onClose: () => void
  onSubmit: (input: ObligationInput) => void
}

const EMPTY: ObligationInput = {
  title: '',
  description: null,
  department: 'Fiscal',
  periodicity: 'Mensal',
  dueDay: 20,
  monthsAfter: 1,
  referenceMonth: 1,
  daysAhead: 5,
  regimes: [],
  defaultAssigneeId: null,
  active: true,
}

const MONTH_OPTIONS = MONTHS.map((m, i) => ({ value: String(i + 1), label: m[0].toUpperCase() + m.slice(1) }))

/** Cadastro de obrigação recorrente (ex.: DCTFWeb, DAS, folha, SPED). */
export function ObligationFormModal({ open, obligation, saving, onClose, onSubmit }: Props) {
  // Montado a cada abertura (key no pai): o estado inicial vem das props.
  const [v, setV] = useState<ObligationInput>(() => (obligation ? { ...obligation } : EMPTY))
  const [touched, setTouched] = useState(false)
  const users = useQuery({
    queryKey: requestKeys.officeUsers,
    queryFn: requestsApi.officeUsers,
    staleTime: 5 * 60_000,
    enabled: open,
  })

  const set = <K extends keyof ObligationInput>(k: K, value: ObligationInput[K]) => setV((cur) => ({ ...cur, [k]: value }))
  const num = (s: string) => (s === '' ? 0 : Number(s))
  const toggleRegime = (r: TaxRegime) =>
    set('regimes', v.regimes.includes(r) ? v.regimes.filter((x) => x !== r) : [...v.regimes, r])

  const errors = {
    title: !v.title.trim() ? 'Informe o título.' : undefined,
    dueDay: v.dueDay < 1 || v.dueDay > 31 ? 'Entre 1 e 31.' : undefined,
    monthsAfter: v.monthsAfter < 0 || v.monthsAfter > 12 ? 'Entre 0 e 12.' : undefined,
    daysAhead: v.daysAhead < 0 || v.daysAhead > 60 ? 'Entre 0 e 60.' : undefined,
  }
  const valid = Object.values(errors).every((e) => !e)
  const err = (k: keyof typeof errors) => (touched ? errors[k] : undefined)

  const submit = () => {
    setTouched(true)
    if (valid) onSubmit(v)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={obligation ? 'Editar obrigação' : 'Nova obrigação recorrente'}
      description="O Contix cria uma tarefa por empresa em cada competência, para o responsável do departamento na empresa."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={submit} loading={saving}>
            Salvar
          </Button>
        </>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <FormField
          label="Título"
          htmlFor="ob-title"
          required
          error={err('title')}
          hint="Vira o título da tarefa, com a competência (ex.: DCTFWeb · 10/2026)."
        >
          <Input
            id="ob-title"
            value={v.title}
            maxLength={200}
            onChange={(e) => set('title', e.target.value)}
            invalid={!!err('title')}
          />
        </FormField>
        <FormField label="Instruções" htmlFor="ob-desc" hint="Opcional. Aparece na descrição de cada tarefa gerada.">
          <Textarea
            id="ob-desc"
            rows={3}
            maxLength={5000}
            value={v.description ?? ''}
            onChange={(e) => set('description', e.target.value)}
          />
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Departamento" htmlFor="ob-dept">
            <Select
              id="ob-dept"
              value={v.department}
              onChange={(e) => set('department', e.target.value as ObligationInput['department'])}
              options={DEPARTMENTS}
            />
          </FormField>
          <FormField label="Periodicidade" htmlFor="ob-per">
            <Select
              id="ob-per"
              value={v.periodicity}
              onChange={(e) => set('periodicity', e.target.value as ObligationInput['periodicity'])}
              options={PERIODICITY_OPTIONS}
            />
          </FormField>
          {v.periodicity !== 'Mensal' && (
            <FormField
              label={v.periodicity === 'Anual' ? 'Mês da competência' : 'Um dos meses de competência'}
              htmlFor="ob-ref"
              hint={v.periodicity === 'Trimestral' ? 'Os demais vêm de 3 em 3 meses (ex.: março → jun, set, dez).' : undefined}
            >
              <Select
                id="ob-ref"
                value={String(v.referenceMonth)}
                onChange={(e) => set('referenceMonth', Number(e.target.value))}
                options={MONTH_OPTIONS}
              />
            </FormField>
          )}
          <FormField
            label="Dia do vencimento legal"
            htmlFor="ob-day"
            error={err('dueDay')}
            hint="Nos meses mais curtos vale o último dia."
          >
            <Input
              id="ob-day"
              type="number"
              min={1}
              max={31}
              value={v.dueDay}
              onChange={(e) => set('dueDay', num(e.target.value))}
            />
          </FormField>
          <FormField
            label="Meses após a competência"
            htmlFor="ob-after"
            error={err('monthsAfter')}
            hint="0 = no próprio mês; 1 = no mês seguinte."
          >
            <Input
              id="ob-after"
              type="number"
              min={0}
              max={12}
              value={v.monthsAfter}
              onChange={(e) => set('monthsAfter', num(e.target.value))}
            />
          </FormField>
          <FormField label="Prazo interno (dias antes)" htmlFor="ob-ahead" error={err('daysAhead')}>
            <Input
              id="ob-ahead"
              type="number"
              min={0}
              max={60}
              value={v.daysAhead}
              onChange={(e) => set('daysAhead', num(e.target.value))}
            />
          </FormField>
          <FormField
            label="Responsável padrão"
            htmlFor="ob-assignee"
            hint="Usado quando a empresa não tem responsável no departamento."
          >
            <Select
              id="ob-assignee"
              placeholder="Nenhum (a empresa fica sem tarefa)"
              value={v.defaultAssigneeId ?? ''}
              onChange={(e) => set('defaultAssigneeId', e.target.value || null)}
              options={(users.data ?? []).map((u) => ({ value: u.id, label: u.name }))}
            />
          </FormField>
        </div>

        <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">{describeSchedule(v)}</p>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-slate-700">Regimes tributários</legend>
          <p className="text-xs text-slate-500">Nenhum marcado: vale para todas as empresas ativas.</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {TAX_REGIMES.map((r) => (
              <label key={r.value} className="flex items-center gap-2 text-sm text-slate-700">
                <Checkbox checked={v.regimes.includes(r.value)} onChange={() => toggleRegime(r.value)} />
                {r.label}
              </label>
            ))}
          </div>
        </fieldset>

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <Checkbox checked={v.active} onChange={(e) => set('active', e.target.checked)} />
          Ativa (gera tarefas automaticamente)
        </label>
      </form>
    </Modal>
  )
}
