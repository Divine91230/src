import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CabinetSettings } from '../domain/cabinetSettings.types'

type CabinetSettingsStore = {
  settings: CabinetSettings
  updateDocuments: (patch: Partial<CabinetSettings['documents']>) => void
  updateUi: (patch: Partial<CabinetSettings['ui']>) => void
  resetSettings: () => void
}

const defaultSettings: CabinetSettings = {
  documents: {
    cabinetName: 'DCP Patrimoine',
    tagline: 'Structurer. Protéger. Élever votre patrimoine',
    advisorName: 'Conseiller patrimonial',
    email: 'contact@dcp.com',
    phone: '',
    website: '',
    orias: '',
    legalStatus: 'Cabinet de conseil patrimonial',
    cifStatus: '',
    intermediaryStatus: '',
    professionalAssociation: '',
    rcPro: '',
    mediator: '',
    remunerationDisclosure:
      'Le cabinet peut être rémunéré sous forme d’honoraires, de commissions ou d’une combinaison des deux selon la mission et les solutions retenues.',
    complaintsEmail: 'contact@dcp.com',
    complaintsHandlingDelay: 'Deux mois maximum à compter de la réception de la réclamation, sauf réglementation particulière plus favorable.',
    headOfficeAddress: '',
  },
  ui: {
    defaultReportViewMode: 'client',
    showInternalNotesByDefault: false,
  },
  updatedAt: new Date().toISOString(),
}

export const useCabinetSettingsStore = create<CabinetSettingsStore>()(
  persist(
    (set) => ({
      settings: defaultSettings,
      updateDocuments: (patch) =>
        set((state) => ({
          settings: {
            ...state.settings,
            documents: { ...state.settings.documents, ...patch },
            updatedAt: new Date().toISOString(),
          },
        })),
      updateUi: (patch) =>
        set((state) => ({
          settings: {
            ...state.settings,
            ui: { ...state.settings.ui, ...patch },
            updatedAt: new Date().toISOString(),
          },
        })),
      resetSettings: () =>
        set({
          settings: {
            ...defaultSettings,
            updatedAt: new Date().toISOString(),
          },
        }),
    }),
    {
      name: 'dcp-cabinet-settings',
    },
  ),
)
