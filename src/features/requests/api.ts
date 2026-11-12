import { api } from '@/lib/api'
import { env } from '@/config/env'
import { mockDelay } from '@/lib/mock'
import { mockRequestTypes } from '@/mocks/data'
import { mockStore } from '@/mocks/store'
import type { ServiceRequest, ServiceRequestType } from '@/types/domain'

export interface CreateRequestInput {
  typeCode: string
  subject: string
  department: string
  description: string
  attachments: File[]
}

export const requestKeys = {
  types: (companyId: string) => ['requests', companyId, 'types'] as const,
  list: (companyId: string) => ['requests', companyId, 'list'] as const,
}

export const requestsApi = {
  async types(companyId: string): Promise<ServiceRequestType[]> {
    if (env.useMocks) return mockDelay(mockRequestTypes, 200)
    const { data } = await api.get<ServiceRequestType[]>(`/companies/${companyId}/request-types`)
    return data
  },

  async list(companyId: string): Promise<ServiceRequest[]> {
    if (env.useMocks) return mockDelay(mockStore.requests(companyId), 250)
    const { data } = await api.get<ServiceRequest[]>(`/companies/${companyId}/requests`)
    return data
  },

  async create(companyId: string, input: CreateRequestInput): Promise<ServiceRequest> {
    if (env.useMocks) {
      const list = mockStore.requests(companyId)
      const type = mockRequestTypes.find((t) => t.code === input.typeCode)
      const created: ServiceRequest = {
        id: crypto.randomUUID(),
        number: Math.max(1000, ...list.map((r) => r.number)) + 1,
        typeName: type?.name ?? 'Solicitação',
        subject: input.subject,
        department: input.department,
        status: 'Open',
        createdAt: mockStore.now(),
        updatedAt: mockStore.now(),
      }
      list.unshift(created)
      return mockDelay(created, 600)
    }
    const form = new FormData()
    form.append('typeCode', input.typeCode)
    form.append('subject', input.subject)
    form.append('department', input.department)
    form.append('description', input.description)
    input.attachments.forEach((f) => form.append('attachments', f))
    const { data } = await api.post<ServiceRequest>(`/companies/${companyId}/requests`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },
}
