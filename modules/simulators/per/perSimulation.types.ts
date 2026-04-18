export type PerTaxMode = 'DEDUCTED' | 'NON_DEDUCTED'

export type PerExitInput = {
  capital: number
  contributions: number
  gains: number
  marginalTaxRate: number
  taxMode: PerTaxMode
  annualPensionRate?: number
  annuityConversionRate?: number
  annuityTaxableShare?: number
  mixCapitalShare?: number
}

export type PerExitScenarioResult = {
  grossAmount: number
  incomeTax: number
  socialContributions: number
  totalTax: number
  netAmount: number
  notes: string[]
}

export type PerExitComparisonResult = {
  capital: PerExitScenarioResult
  annuity: PerExitScenarioResult
  mixed: PerExitScenarioResult
  recommendation: string
}
