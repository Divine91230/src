import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ComplaintRecord, ComplaintStatus } from '../domain/compliance.types'

type CreateComplaintInput = Omit<ComplaintRecord, 'id' | 'status'>

type ComplaintsStore = {
  complaints: ComplaintRecord[]
  createComplaint: (input: CreateComplaintInput) => string
  updateComplaint: (id: string, patch: Partial<Omit<ComplaintRecord, 'id'>>) => void
  setComplaintStatus: (id: string, status: ComplaintStatus) => void
  removeComplaint: (id: string) => void
}

function createId() {
  return `complaint-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export const useComplaintsStore = create<ComplaintsStore>()(
  persist(
    (set) => ({
      complaints: [],
      createComplaint: (input) => {
        const id = createId()
        const complaint: ComplaintRecord = {
          id,
          status: 'ouverte',
          ...input,
        }
        set((state) => ({ complaints: [complaint, ...state.complaints] }))
        return id
      },
      updateComplaint: (id, patch) =>
        set((state) => ({
          complaints: state.complaints.map((item) =>
            item.id === id ? { ...item, ...patch } : item,
          ),
        })),
      setComplaintStatus: (id, status) =>
        set((state) => ({
          complaints: state.complaints.map((item) =>
            item.id === id ? { ...item, status } : item,
          ),
        })),
      removeComplaint: (id) =>
        set((state) => ({
          complaints: state.complaints.filter((item) => item.id !== id),
        })),
    }),
    {
      name: 'dcp-complaints-store',
    },
  ),
)
