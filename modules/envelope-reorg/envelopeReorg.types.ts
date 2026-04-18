import type { RiskLevel } from '../../pages/discovery/discovery.types'

export type ExistingEnvelopeReorgType =
  | 'ASSURANCE_VIE'
  | 'PEA'
  | 'CTO'
  | 'PER'
  | 'SCPI'
  | 'EPARGNE_BANCAIRE'
  | 'AUTRE'

export type EnvelopeReorganizationDecision =
  | 'KEEP'
  | 'KEEP_REALLOCATE'
  | 'KEEP_STOP_PAYMENTS'
  | 'TRANSFER'
  | 'ADD_COMPLEMENT'
  | 'REPLACE_PARTIAL'
  | 'REPLACE_TOTAL'
  | 'MANUAL_REVIEW'

export type EnvelopeReorganizationStatusLabel =
  | 'Conserver'
  | 'Conserver mais réallouer'
  | 'Conserver sans nouveaux versements'
  | 'Transférer'
  | 'Compléter avec une nouvelle enveloppe'
  | 'Remplacer partiellement'
  | 'Remplacer totalement'
  | 'À étudier manuellement'

export type ExistingEnvelopeRecord = {
  id: string
  label: string
  sourceAssetId?: string
  type: ExistingEnvelopeReorgType
  provider?: string
  openingDate?: string
  balance: number
  category: string
  envelopeType: string
  liquidityLevel: 'Élevée' | 'Intermédiaire' | 'Faible'
  hasScheduledPayments?: boolean
  beneficiaryClauseUpdated?: boolean
  currentRiskProfile?: RiskLevel
  objectiveInitial?: string
  taxSeniorityYears?: number
  institution?: string
  available?: boolean
  comment?: string
}

export type EnvelopeReorganizationScores = {
  fiscalQuality: number
  financialQuality: number
  costQuality: number
  liquidityQuality: number
  suitabilityProfile: number
  suitabilityObjective: number
  conservationRelevance: number
  transferRelevance: number
  complementRelevance: number
  globalScore: number
}

export type EnvelopeReorganizationReview = {
  envelope: ExistingEnvelopeRecord
  scores: EnvelopeReorganizationScores
  decision: EnvelopeReorganizationDecision
  statusLabel: EnvelopeReorganizationStatusLabel
  diagnosis: string
  advisorReading: string
  vigilancePoints: string[]
  clientImpact: string
  complianceJustification: string
  recommendedAction: string
  preserveStrengths: string[]
  improvePoints: string[]
  avoidPoints: string[]
  priorityLevel: 'Haute' | 'Moyenne' | 'Faible'
}

export type EnvelopeReorganizationSummary = {
  keep: EnvelopeReorganizationReview[]
  reallocate: EnvelopeReorganizationReview[]
  stopPayments: EnvelopeReorganizationReview[]
  transfer: EnvelopeReorganizationReview[]
  complement: EnvelopeReorganizationReview[]
  replace: EnvelopeReorganizationReview[]
  manual: EnvelopeReorganizationReview[]
  totalEncours: number
  actionableCount: number
}

export type EnvelopeReorganizationContext = {
  riskProfile: RiskLevel
  objective: string
  secondaryObjective?: string
  tmiLabel: string
  emergencyMonths: number
  debtRatio: number
}
