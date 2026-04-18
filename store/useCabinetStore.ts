import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { buildDiscoveryCompleteness } from '../modules/quality/buildDiscoveryCompleteness'
import { buildInitialDiscoveryState } from '../pages/discovery/discovery.initial'
import {
  calculateAge,
  getEmergencyFundMonths,
  getIncludedChargesTotal,
  getLiquidAssetsTotal,
  getResolvedRiskProfile,
  getResolvedTmi,
  getSelectedHouseholdIncome,
  getSelectedSavingsCapacity,
  getTotalAssets,
  getTotalLiabilitiesCapital,
  toSafeNumber,
} from '../pages/discovery/discovery.helpers'
import { buildAnalysis } from '../modules/analysis/buildAnalysis'
import { buildPriorityPlan } from '../modules/priorities/buildPriorityPlan'
import { buildClientScoring } from '../modules/scoring/buildClientScoring'
import type { ClientSnapshot, RiskProfile } from '../domain/types/patrimony'

export type ClientStatus = 'Prospect' | 'Client'
export type ClientPriority = 'Haute' | 'Moyenne' | 'Faible'
export type ClientCompleteness = 'Complet' | 'Incomplet'
export type LinkedRelationshipRole = 'Conjoint' | 'Enfant' | 'Autre'

export type ClientRecord = {
  id: string
  fullName: string
  status: ClientStatus
  objective: string
  progress: string
  lastContact: string
  priority: ClientPriority
  completeness: ClientCompleteness
  nextAction: string
  archived: boolean
  parentClientId: string | null
  relationshipRole: LinkedRelationshipRole | null
  isLinkedPerson: boolean
}

type CabinetStore = {
  clients: ClientRecord[]
  selectedClient: ClientRecord | null
  discoveryByClientId: Record<string, any>

  setSelectedClientById: (id: string) => void
  addClient: (client: ClientRecord) => void
  updateClient: (id: string, patch: Partial<ClientRecord>) => void
  convertProspectToClient: (id: string) => void
  archiveClient: (id: string) => void
  restoreClient: (id: string) => void
  createNewClient: () => ClientRecord

  getDiscoveryForSelectedClient: () => any | null
  setDiscoveryForSelectedClient: (data: any) => void
  clearDiscoveryForClient: (clientId: string) => void

  syncSelectedClientIdentity: (data: any) => void
  syncLinkedPersonsFromSelectedClientDiscovery: (data: any) => void
}

const initialClients: ClientRecord[] = [
  {
    id: '1',
    fullName: 'Claire Martin',
    status: 'Prospect',
    objective: 'Préparer la retraite et diversifier',
    progress: 'Découverte à planifier',
    lastContact: 'Hier',
    priority: 'Haute',
    completeness: 'Incomplet',
    nextAction: 'Planifier le premier rendez-vous',
    archived: false,
    parentClientId: null,
    relationshipRole: null,
    isLinkedPerson: false,
  },
  {
    id: '2',
    fullName: 'Antoine Bernard',
    status: 'Client',
    objective: 'Structurer l\u2019épargne et optimiser la fiscalité',
    progress: 'Analyse en cours',
    lastContact: 'Aujourd\u2019hui',
    priority: 'Moyenne',
    completeness: 'Incomplet',
    nextAction: 'Compléter la partie fiscalité',
    archived: false,
    parentClientId: null,
    relationshipRole: null,
    isLinkedPerson: false,
  },
]

function todayLabel() {
  return 'Aujourd\u2019hui'
}

function buildDiscoveryProgressLabel(data: any) {
  const completeness = buildDiscoveryCompleteness(data)
  if (completeness.isComplete) return 'Découverte structurée'
  if (completeness.score >= 5) return 'Découverte avancée'
  if (completeness.score >= 3) return 'Découverte commencée'
  return 'Découverte à compléter'
}

// ─── Conversion Discovery → ClientSnapshot ────────────────────────────────────
// Cette fonction traduit les données brutes de la découverte patrimoniale
// en un ClientSnapshot typé, consommable par tous les modules de calcul.
function discoveryToClientSnapshot(data: any): ClientSnapshot | null {
  if (!data) return null

  try {
    const monthlyIncome = getSelectedHouseholdIncome(data)
    const monthlyCharges = getIncludedChargesTotal(data?.charges ?? [])
    const monthlySavings = getSelectedSavingsCapacity(data)
    const totalAssets = getTotalAssets(data?.assets ?? [])
    const liquidities = getLiquidAssetsTotal(data?.assets ?? [])
    const totalLiabilities = getTotalLiabilitiesCapital(data)

    // Répartition des actifs par catégorie
    const realEstate = (data?.assets ?? [])
      .filter((a: any) => a.category === 'Immobilier')
      .reduce((sum: number, a: any) => sum + toSafeNumber(a.amount, 0), 0)

    const financial = (data?.assets ?? [])
      .filter((a: any) => a.category === 'Financier')
      .reduce((sum: number, a: any) => sum + toSafeNumber(a.amount, 0), 0)

    const professional = (data?.assets ?? [])
      .filter((a: any) => a.category === 'Professionnel')
      .reduce((sum: number, a: any) => sum + toSafeNumber(a.amount, 0), 0)

    const other = (data?.assets ?? [])
      .filter((a: any) => !['Immobilier', 'Financier', 'Professionnel', 'Liquidités'].includes(a.category))
      .reduce((sum: number, a: any) => sum + toSafeNumber(a.amount, 0), 0)

    // Répartition du passif
    const mortgage = (data?.liabilities ?? [])
      .filter((l: any) => l.type === 'Crédit immobilier locatif' || l.type === 'Loyer / mensualité RP')
      .reduce((sum: number, l: any) => sum + toSafeNumber(l.outstandingCapital, 0), 0)

    const consumerDebt = (data?.liabilities ?? [])
      .filter((l: any) => l.type === 'Crédit consommation')
      .reduce((sum: number, l: any) => sum + toSafeNumber(l.outstandingCapital, 0), 0)

    const otherDebt = Math.max(0, totalLiabilities - mortgage - consumerDebt)

    // TMI
    const tmiRaw = getResolvedTmi(data)
    const tmiValue = toSafeNumber(String(tmiRaw ?? '').replace('%', '').trim(), 0)
    const marginalTaxRate = tmiValue / 100

    // Profil de risque → RiskProfile
    const riskLevelLabel = getResolvedRiskProfile(data)
    const riskProfile: RiskProfile =
      riskLevelLabel === 'Dynamique'
        ? 'DYNAMIQUE'
        : riskLevelLabel === 'Prudent'
        ? 'PRUDENT'
        : 'EQUILIBRE'

    // Objectifs
    const mainObjective: string = data?.objectives?.mainObjective ?? ''
    const goals: ClientSnapshot['goals'] = []
    if (/retraite/i.test(mainObjective)) goals.push('RETRAITE')
    if (/transmission/i.test(mainObjective)) goals.push('TRANSMISSION')
    if (/protection/i.test(mainObjective)) goals.push('PROTECTION')
    if (/diversif/i.test(mainObjective)) goals.push('DIVERSIFICATION')
    if (/trésorerie|liquidité/i.test(mainObjective)) goals.push('TRESORERIE')
    if (goals.length === 0) goals.push('DIVERSIFICATION')

    // Foyer
    const maritalStatus = data?.mainPerson?.householdStatus ?? 'CELIBATAIRE'
    const maritalStatusMapped: ClientSnapshot['household']['maritalStatus'] =
      maritalStatus === 'Marié(e)' ? 'MARIE'
      : maritalStatus === 'Pacsé(e)' ? 'PACSE'
      : maritalStatus === 'Divorcé(e)' ? 'DIVORCE'
      : maritalStatus === 'Veuf / Veuve' ? 'VEUF'
      : 'CELIBATAIRE'

    const childrenCount = (data?.linkedPersons ?? []).filter(
      (p: any) => p.role === 'Enfant',
    ).length

    const taxParts = toSafeNumber(data?.tax?.taxPartsManual, 0) || (maritalStatusMapped === 'MARIE' || maritalStatusMapped === 'PACSE' ? 2 : 1) + childrenCount * 0.5

    // Âge
    const birthDate = data?.mainPerson?.birthDate ?? ''
    const age = calculateAge(birthDate) ?? 40

    const snapshot: ClientSnapshot = {
      fullName: `${data?.mainPerson?.firstName ?? ''} ${data?.mainPerson?.lastName ?? ''}`.trim() || 'Client',
      age,
      household: {
        maritalStatus: maritalStatusMapped,
        taxParts,
        childrenCount,
      },
      budget: {
        monthlyNetIncome: monthlyIncome,
        monthlyFixedExpenses: monthlyCharges,
        monthlySavingsCapacity: monthlySavings,
      },
      assets: {
        realEstate,
        financial,
        liquidities,
        professional,
        other,
      },
      liabilities: {
        mortgage,
        consumerDebt,
        otherDebt,
      },
      marginalTaxRate,
      goals,
      riskProfile,
    }

    return snapshot
  } catch {
    return null
  }
}

export const useCabinetStore = create<CabinetStore>()(
  persist(
    (set, get) => ({
      clients: initialClients,
      selectedClient: initialClients[0],
      discoveryByClientId: {},

      setSelectedClientById: (id) => {
        const client = get().clients.find((item) => item.id === id) ?? null
        set({ selectedClient: client })
      },

      addClient: (client) => set((state) => ({ clients: [...state.clients, client] })),

      updateClient: (id, patch) =>
        set((state) => ({
          clients: state.clients.map((client) => (client.id === id ? { ...client, ...patch } : client)),
          selectedClient:
            state.selectedClient?.id === id ? { ...state.selectedClient, ...patch } : state.selectedClient,
        })),

      convertProspectToClient: (id) => {
        get().updateClient(id, {
          status: 'Client',
          lastContact: todayLabel(),
          nextAction: 'Poursuivre la découverte patrimoniale',
        })
      },

      archiveClient: (id) => {
        set((state) => ({
          clients: state.clients.map((client) => (client.id === id ? { ...client, archived: true } : client)),
          selectedClient: state.selectedClient?.id === id ? null : state.selectedClient,
        }))
      },

      restoreClient: (id) => {
        get().updateClient(id, { archived: false, lastContact: todayLabel() })
      },

      createNewClient: () => {
        const newClient: ClientRecord = {
          id: String(Date.now()),
          fullName: 'Nouveau client',
          status: 'Prospect',
          objective: '',
          progress: 'Découverte à compléter',
          lastContact: todayLabel(),
          priority: 'Moyenne',
          completeness: 'Incomplet',
          nextAction: 'Compléter la fiche client',
          archived: false,
          parentClientId: null,
          relationshipRole: null,
          isLinkedPerson: false,
        }

        const emptyDiscovery = buildInitialDiscoveryState(newClient)

        set((state) => ({
          clients: [newClient, ...state.clients],
          selectedClient: newClient,
          discoveryByClientId: {
            ...state.discoveryByClientId,
            [newClient.id]: emptyDiscovery,
          },
        }))

        return newClient
      },

      getDiscoveryForSelectedClient: () => {
        const selectedClient = get().selectedClient
        if (!selectedClient) return null
        return get().discoveryByClientId[selectedClient.id] ?? null
      },

      setDiscoveryForSelectedClient: (data) => {
        const selectedClient = get().selectedClient
        if (!selectedClient) return
        set((state) => ({
          discoveryByClientId: { ...state.discoveryByClientId, [selectedClient.id]: data },
        }))
      },

      clearDiscoveryForClient: (clientId) =>
        set((state) => {
          const next = { ...state.discoveryByClientId }
          delete next[clientId]
          return { discoveryByClientId: next }
        }),

      syncSelectedClientIdentity: (data) => {
        const selectedClient = get().selectedClient
        if (!selectedClient) return

        const completeness = buildDiscoveryCompleteness(data)
        const fullName = `${data?.mainPerson?.firstName ?? ''} ${data?.mainPerson?.lastName ?? ''}`.trim() || selectedClient.fullName
        const objective = data?.objectives?.mainObjective || selectedClient.objective

        get().updateClient(selectedClient.id, {
          fullName,
          objective,
          progress: buildDiscoveryProgressLabel(data),
          completeness: completeness.isComplete ? 'Complet' : 'Incomplet',
          nextAction: completeness.nextAction,
          lastContact: todayLabel(),
        })
      },

      syncLinkedPersonsFromSelectedClientDiscovery: (data) => {
        const selectedClient = get().selectedClient
        if (!selectedClient) return

        const linkedPersons = Array.isArray(data?.linkedPersons) ? data.linkedPersons : []
        const parentId = selectedClient.id

        set((state) => {
          const existingForParent = state.clients.filter(
            (client) => client.parentClientId === parentId && client.isLinkedPerson,
          )
          const preservedOthers = state.clients.filter(
            (client) => !(client.parentClientId === parentId && client.isLinkedPerson),
          )

          const syncedLinkedClients: ClientRecord[] = linkedPersons.map((person: any) => {
            const fullName = `${person.firstName ?? ''} ${person.lastName ?? ''}`.trim()
            const existing = existingForParent.find(
              (client) =>
                client.id === person.id ||
                (client.relationshipRole === person.role && client.fullName === fullName),
            )

            return {
              id: person.id,
              fullName: fullName || `${person.role} lié(e)`,
              status: 'Client',
              objective: data?.objectives?.mainObjective || 'Fiche liée au dossier principal',
              progress: fullName ? 'Fiche liée au dossier principal' : 'Identité liée à compléter',
              lastContact: todayLabel(),
              priority: existing?.priority ?? 'Moyenne',
              completeness: fullName ? 'Complet' : 'Incomplet',
              nextAction: `Lié au dossier ${state.clients.find((c) => c.id === parentId)?.fullName ?? 'principal'}`,
              archived: existing?.archived ?? false,
              parentClientId: parentId,
              relationshipRole: person.role,
              isLinkedPerson: true,
            }
          })

          return { clients: [...preservedOthers, ...syncedLinkedClients] }
        })
      },
    }),
    {
      name: 'dcp-cabinet-store',
      partialize: (state) => ({
        clients: state.clients,
        selectedClient: state.selectedClient,
        discoveryByClientId: state.discoveryByClientId,
      }),
    },
  ),
)

// ─── useCurrentAnalysis ───────────────────────────────────────────────────────
// Calcule les indicateurs clés du dossier client sélectionné en temps réel,
// à partir des données de découverte patrimoniale réelles.
// Remplace l'ancienne version qui retournait des données hardcodées fictives.
export function useCurrentAnalysis() {
  const selectedClient = useCabinetStore((state) => state.selectedClient)
  const discoveryByClientId = useCabinetStore((state) => state.discoveryByClientId)

  const discovery = selectedClient
    ? discoveryByClientId[selectedClient.id] ?? null
    : null

  // Pas de découverte : on retourne des valeurs neutres explicites
  if (!discovery) {
    return {
      hasData: false,
      netWorth: null,
      emergencyFundMonths: null,
      debtRatio: null,
      globalScore: null,
      priorities: [],
      snapshot: null,
    }
  }

  // Conversion découverte → snapshot typé
  const snapshot = discoveryToClientSnapshot(discovery)

  if (!snapshot) {
    return {
      hasData: false,
      netWorth: null,
      emergencyFundMonths: null,
      debtRatio: null,
      globalScore: null,
      priorities: [],
      snapshot: null,
    }
  }

  // Calculs patrimoniaux réels
  const grossAssets =
    snapshot.assets.realEstate +
    snapshot.assets.financial +
    snapshot.assets.liquidities +
    snapshot.assets.professional +
    snapshot.assets.other

  const totalDebt =
    snapshot.liabilities.mortgage +
    snapshot.liabilities.consumerDebt +
    snapshot.liabilities.otherDebt

  const netWorth = grossAssets - totalDebt

  const emergencyFundMonths = getEmergencyFundMonths(discovery)

  const debtRatio =
    snapshot.budget.monthlyNetIncome > 0
      ? snapshot.budget.monthlyFixedExpenses / snapshot.budget.monthlyNetIncome
      : 0

  // Score global et priorités
  const scoring = buildClientScoring(snapshot)
  const priorities = buildPriorityPlan(snapshot, scoring)

  return {
    hasData: true,
    netWorth: Math.round(netWorth),
    emergencyFundMonths: Number(emergencyFundMonths.toFixed(1)),
    debtRatio: Number(debtRatio.toFixed(3)),
    globalScore: scoring.globalScore,
    priorities: priorities.slice(0, 3).map((p) => ({
      title: p.title,
      summary: p.summary,
      score: p.score,
      step: p.step,
    })),
    snapshot,
  }
}

// ─── useClientSnapshot ────────────────────────────────────────────────────────
// Hook utilitaire pour récupérer directement le ClientSnapshot du client
// sélectionné — utilisable dans AnalysisPage, ScenariosPage, etc.
export function useClientSnapshot(): ClientSnapshot | null {
  const selectedClient = useCabinetStore((state) => state.selectedClient)
  const discoveryByClientId = useCabinetStore((state) => state.discoveryByClientId)

  const discovery = selectedClient
    ? discoveryByClientId[selectedClient.id] ?? null
    : null

  return discoveryToClientSnapshot(discovery)
}
