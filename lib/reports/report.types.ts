import type { CabinetDocumentConfig } from '../../domain/cabinetSettings.types'

export type ReportViewMode = 'client' | 'cabinet'
export type ScenarioKey = 'secure' | 'balanced' | 'growth'

export type AllocationLine = {
  id: string
  envelope: string
  initialPercent?: number
  percent?: number
  euroAmount: number
  monthlyPercent?: number
  monthlyEuroAmount: number
  securePercent?: number
  ucPercent?: number
  initialSecurePercent?: number
  initialUcPercent?: number
  monthlySecurePercent?: number
  monthlyUcPercent?: number
}

export type StoredScenarioChoice = {
  recommendedKey: ScenarioKey
  selectedKey: ScenarioKey
  clientFollowsRecommendation: boolean
  adjustedInitialByKey: Record<ScenarioKey, number>
  adjustedMonthlyByKey: Record<ScenarioKey, number>
  allocationsByKey: Record<ScenarioKey, AllocationLine[]>
}

export type ReportClientData = {
  id: string
  fullName: string
  firstName?: string
  lastName?: string
  reportDate: string
}

export type ReportSummaryData = {
  totalAssets: number
  totalLiabilities: number
  netWorth: number
  selectedIncome: number
  selectedCharges: number
  selectedSavings: number
  remainingToLive: number
  emergencyMonths: number
  taxParts: number
  tmi: number
  riskProfile: string
}

export type ReportBreakdownLine = {
  id: string
  label: string
  family: string
  amount: number
  institution?: string
  comment?: string
}

export type ReportInvestorProfileData = {
  score: number
  profile: string
  items: Array<{ label: string; value: string }>
}

export type ReportProjectData = {
  objective: string
  secondaryObjective: string
  horizon: string | number
  liquidityNeed: string
  fundingMode: string
  initialAmount: number
  monthlyAmount: number
}

export type ReportSuitabilityData = {
  status: 'ADAPTEE' | 'ADAPTEE_SOUS_RESERVE' | 'NON_ADAPTEE'
  summary: string
  strengths: string[]
  reserves: string[]
}

export type ReportStrategyData = {
  recommendedScenarioKey?: ScenarioKey
  selectedScenarioKey?: ScenarioKey
  recommendedScenarioLabel: string
  selectedScenarioLabel: string
  objective: string
  secondaryObjective: string
  horizon: string | number
  initialAmount: number
  monthlyAmount: number
  clientFollowsRecommendation: boolean
}

export type ReportAllocationTotals = {
  initialTotal: number
  monthlyTotal: number
  secureInitial: number
  ucInitial: number
  secureMonthly: number
  ucMonthly: number
  secureInitialPct: number
  ucInitialPct: number
  secureMonthlyPct: number
  ucMonthlyPct: number
}

export type ReportAllocationData = {
  lines: AllocationLine[]
  totals: ReportAllocationTotals
}

export type ReportExistingEnvelopeUseLine = {
  id: string
  label: string
  currentAmount: number
  mobilizedAmount: number
  remainingAmount: number
  mobilizedPercent: number
  useMode: 'full' | 'partial'
  decision: string
  rationale: string
}

export type DiagnosticTitle = 'Structurer' | 'Protéger' | 'Élever'

export type ReportDiagnosticBlock = {
  title: DiagnosticTitle
  text: string
}

export type ReportActionStep = {
  index: number
  title: string
  text: string
}

export type ReportData = {
  client: ReportClientData
  cabinet: CabinetDocumentConfig
  summary: ReportSummaryData
  assetsBreakdown: ReportBreakdownLine[]
  liabilitiesBreakdown: ReportBreakdownLine[]
  investorProfile: ReportInvestorProfileData
  project: ReportProjectData
  suitability: ReportSuitabilityData
  strategy: ReportStrategyData
  allocation: ReportAllocationData
  existingEnvelopeUses: ReportExistingEnvelopeUseLine[]
  diagnostics: ReportDiagnosticBlock[]
  actionPlan: ReportActionStep[]
}
