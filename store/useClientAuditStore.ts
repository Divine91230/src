import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ClientAuditRecord } from '../domain/audit.types'

type ClientAuditStore = {
  items: ClientAuditRecord[]
  addAudit: (record: Omit<ClientAuditRecord, 'id' | 'createdAt'>) => void
  clearClientAudit: (clientId: string) => void
}

function createId() {
  return `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export const useClientAuditStore = create<ClientAuditStore>()(
  persist(
    (set) => ({
      items: [],
      addAudit: (record) =>
        set((state) => ({
          items: [
            {
              id: createId(),
              createdAt: new Date().toISOString(),
              ...record,
            },
            ...state.items,
          ].slice(0, 1000),
        })),
      clearClientAudit: (clientId) =>
        set((state) => ({
          items: state.items.filter((item) => item.clientId !== clientId),
        })),
    }),
    { name: 'dcp-client-audit-store' },
  ),
)
