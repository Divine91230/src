import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ClientDeviationRecord } from '../domain/deviation.types'

type UpsertDeviationInput = Omit<ClientDeviationRecord, 'id' | 'createdAt' | 'updatedAt'>

type DeviationStore = {
  deviations: ClientDeviationRecord[]
  upsertDeviation: (input: UpsertDeviationInput) => string
  removeDeviation: (clientId: string) => void
  getDeviationByClientId: (clientId: string) => ClientDeviationRecord | null
}

function createId() {
  return `deviation-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export const useDeviationStore = create<DeviationStore>()(
  persist(
    (set, get) => ({
      deviations: [],
      upsertDeviation: (input) => {
        const existing = get().deviations.find((item) => item.clientId === input.clientId)
        const now = new Date().toISOString()

        if (existing) {
          set((state) => ({
            deviations: state.deviations.map((item) =>
              item.clientId === input.clientId
                ? {
                    ...item,
                    ...input,
                    updatedAt: now,
                  }
                : item,
            ),
          }))
          return existing.id
        }

        const id = createId()
        set((state) => ({
          deviations: [
            {
              id,
              ...input,
              createdAt: now,
              updatedAt: now,
            },
            ...state.deviations,
          ],
        }))
        return id
      },
      removeDeviation: (clientId) =>
        set((state) => ({
          deviations: state.deviations.filter((item) => item.clientId !== clientId),
        })),
      getDeviationByClientId: (clientId) =>
        get().deviations.find((item) => item.clientId === clientId) ?? null,
    }),
    {
      name: 'dcp-deviation-store',
    },
  ),
)
