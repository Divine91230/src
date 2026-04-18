export type PriorityAxis =
  | 'PROTECTION'
  | 'LIQUIDITE'
  | 'DIVERSIFICATION'
  | 'FISCALITE'
  | 'RETRAITE'
  | 'TRANSMISSION'

export type AnalysisIndicator = {
  code: string
  label: string
  value: number | string
  tone?: 'neutral' | 'good' | 'warning' | 'danger'
}

export type Recommendation = {
  axis: PriorityAxis
  title: string
  summary: string
  urgency: 'FAIBLE' | 'MOYENNE' | 'ELEVEE'
  rationale: string[]
}

export type ScenarioCard = {
  code: 'S1_SECURISATION' | 'S2_EQUILIBRE' | 'S3_VALORISATION'
  title: string
  description: string
  expectedNetReturn: number
  monthlyEffort: number
  liquidityLevel: 'FORTE' | 'MOYENNE' | 'FAIBLE'
  suitability: 'ADAPTEE' | 'ADAPTEE_SOUS_RESERVE' | 'NON_ADAPTEE'
  rationale: string[]
}

export type AnalysisResult = {
  emergencyFundMonths: number
  debtRatio: number
  netWorth: number
  concentrationRealEstate: number
  indicators: AnalysisIndicator[]
  priorities: Recommendation[]
  scenarios: ScenarioCard[]
  globalScore: number
  alerts: string[]
}
