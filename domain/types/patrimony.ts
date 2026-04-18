export type RiskProfile = 'PRUDENT' | 'EQUILIBRE' | 'DYNAMIQUE'
export type MaritalStatus = 'CELIBATAIRE' | 'MARIE' | 'PACSE' | 'DIVORCE' | 'VEUF'
export type GoalCode = 'PROTECTION' | 'DIVERSIFICATION' | 'RETRAITE' | 'TRANSMISSION' | 'TRESORERIE'
export type EnvelopeCode = 'CASH' | 'AV' | 'PER' | 'PEA' | 'CTO' | 'SCPI_DIRECT' | 'SCPI_AV'

export type Household = {
  maritalStatus: MaritalStatus
  taxParts: number
  childrenCount: number
}

export type BudgetProfile = {
  monthlyNetIncome: number
  monthlyFixedExpenses: number
  monthlySavingsCapacity: number
}

export type AssetBreakdown = {
  realEstate: number
  financial: number
  liquidities: number
  professional: number
  other: number
}

export type LiabilityBreakdown = {
  mortgage: number
  consumerDebt: number
  otherDebt: number
}

// ─── Couverture prévoyance ────────────────────────────────────────────────────
// Ces données sont issues de la section Protection de la découverte.
// Elles alimentent directement le scoring de l'axe Protection familiale.
export type ProtectionCoverage = {
  hasDeathCoverage: boolean        // Couverture décès en place
  hasDisabilityCoverage: boolean   // Couverture invalidité en place
  hasBorrowerInsurance: boolean    // Assurance emprunteur en place
  spouseProtected: boolean         // Conjoint protégé
  dependantsProtected: boolean     // Enfants / personnes à charge protégés
}

export type ClientSnapshot = {
  fullName: string
  age: number
  household: Household
  budget: BudgetProfile
  assets: AssetBreakdown
  liabilities: LiabilityBreakdown
  marginalTaxRate: number
  goals: GoalCode[]
  riskProfile: RiskProfile
  // Optionnel — absent si section Protection non remplie
  protection?: ProtectionCoverage
}
