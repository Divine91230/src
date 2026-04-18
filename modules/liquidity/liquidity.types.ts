export type FundingSourceType = 'ASSURANCE_VIE' | 'CAPITALISATION' | 'PEA' | 'CTO' | 'PER' | 'CASH' | 'SCPI'

export type FundingSourceInput = {
  id: string
  label: string
  type: FundingSourceType
  contractValue: number
  totalContributions?: number
  availableAmount?: number
  holdingYears?: number
  isCouple?: boolean
  marginalTaxRate?: number
  strategicRole?: string
}

export type FundingSourceReview = {
  id: string
  label: string
  type: FundingSourceType
  availableAmount: number
  estimatedTax: number
  estimatedNet: number
  taxVigilance: 'Faible' | 'Modérée' | 'Élevée'
  patrimonialVigilance: 'Faible' | 'Modérée' | 'Élevée'
  advisorReading: string
  recommendation: 'À privilégier' | 'Mobilisable partiellement' | 'À arbitrer avec prudence' | 'À éviter dans l’immédiat'
}
