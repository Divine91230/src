import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { GeneratedReportRecord } from '../domain/compliance.types'

type ReportArchiveStore = {
  history: GeneratedReportRecord[]
  addGeneratedReport: (record: Omit<GeneratedReportRecord, 'id'>) => void
  removeGeneratedReport: (id: string) => void
  clearClientHistory: (clientId: string) => void
}

function createId() {
  return `report-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export const useReportArchiveStore = create<ReportArchiveStore>()(
  persist(
    (set) => ({
      history: [],
      addGeneratedReport: (record) =>
        set((state) => ({
          history: [{ id: createId(), ...record }, ...state.history].slice(0, 500),
        })),
      removeGeneratedReport: (id) =>
        set((state) => ({
          history: state.history.filter((item) => item.id !== id),
        })),
      clearClientHistory: (clientId) =>
        set((state) => ({
          history: state.history.filter((item) => item.clientId !== clientId),
        })),
    }),
    { name: 'dcp-report-archive-store' },
  ),
)
