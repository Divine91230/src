export type SuitabilityStatus = 'ADAPTEE' | 'ADAPTEE_SOUS_RESERVE' | 'NON_ADAPTEE'

export type SuitabilityResult = {
  status: SuitabilityStatus
  summary: string
  strengths: string[]
  reserves: string[]
}
