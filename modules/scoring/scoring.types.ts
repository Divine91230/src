export type ScoreTone = "good" | "warning" | "danger" | "neutral"

export type ClientScoreCode =
  | 'SECURITY'
  | 'LIQUIDITY'
  | 'DIVERSIFICATION'
  | 'RETIREMENT'
  | 'PROTECTION'
  | 'TAX'
  | 'TRANSMISSION'
  | 'DEBT'

export type ClientScoreItem = {
  code: ClientScoreCode
  label: string
  value: number
  tone: ScoreTone
  summary: string
}

export type ClientScoringResult = {
  globalScore: number
  items: ClientScoreItem[]
}
