export type WithdrawalEnvelopeType = 'ASSURANCE_VIE' | 'CAPITALISATION' | 'PEA' | 'CTO' | 'PER' | 'CASH'

export type WithdrawalSimulationInput = {
  contractValue: number
  totalContributions: number
  requestedGrossWithdrawal: number
  holdingYears: number
  isCouple: boolean
  marginalTaxRate?: number
}

export type WithdrawalSimulationResult = {
  requestedGrossWithdrawal: number
  contributionPortion: number
  gainPortion: number
  allowanceUsed: number
  taxableGainAfterAllowance: number
  incomeTax: number
  socialContributions: number
  totalTax: number
  netWithdrawal: number
  effectiveTaxRate: number
  notes: string[]
}
