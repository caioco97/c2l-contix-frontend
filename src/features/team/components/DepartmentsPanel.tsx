import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Pencil } from 'lucide-react'
import { Badge, Button, Checkbox, FormField, Input, Modal, Table, TBody, Td, Th, THead, Tr, useToast } from '@/components/ui'
import { getErrorMessage } from '@/lib/api'
import { teamApi, teamKeys, type OfficeDepartment } from '../api'

/** Departamentos do escritório: o administrador renomeia e desativa os que o escritório não usa. */
export function DepartmentsPanel({ departments, canEdit }: { departments: OfficeDepartment[]; canEdit: boolean }) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<OfficeDepartment | null>(null)
  const [name, setName] = useState('')
  const [active, setActive] = useState(true)

  const save = useMutation({
    mutationFn: () => teamApi.updateDepartment(editing!.code, { name, active }),
    onSuccess: () => {
      toast.success('Departamento atualizado.')
      queryClient.invalidateQueries({ queryKey: teamKeys.all })
      setEditing(null)
    },
    onError: (e) => toast.error(getErrorMessage(e, 'Não foi possível salvar o departamento.')),
  })

  const open = (d: OfficeDepartment) => {
    setEditing(d)
    setName(d.name)
    setActive(d.active)
  }

  return (
    <>
      <Table>
        <THead>
          <tr>
            <Th>Departamento</Th>
            <Th>Pessoas</Th>
            <Th>Situação</Th>
            {canEdit && <Th className="w-12" />}
          </tr>
        </THead>
        <TBody>
          {departments.map((d) => (
            <Tr key={d.code}>
              <Td className="font-medium text-ink">{d.name}</Td>
              <Td>{d.members}</Td>
              <Td>{d.active ? <Badge tone="success">Ativo</Badge> : <Badge>Inativo</Badge>}</Td>
              {canEdit && (
                <Td>
                  <Button variant="ghost" size="icon" aria-label={`Editar ${d.name}`} onClick={() => open(d)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </Td>
              )}
            </Tr>
          ))}
        </TBody>
      </Table>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title="Editar departamento"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button onClick={() => save.mutate()} loading={save.isPending} disabled={!name.trim()}>
              Salvar
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <FormField label="Nome" htmlFor="dept-name" required>
            <Input id="dept-name" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
          </FormField>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <Checkbox checked={active} onChange={(e) => setActive(e.target.checked)} />
            Ativo (aparece nos formulários e pode receber solicitações)
          </label>
        </div>
      </Modal>
    </>
  )
}
