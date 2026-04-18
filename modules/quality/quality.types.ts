export type QualitySeverity = 'blocking' | 'warning' | 'info'

export type QualityIssue = {
  id: string
  severity: QualitySeverity
  title: string
  message: string
  section:
    | 'identity'
    | 'budget'
    | 'assets'
    | 'liabilities'
    | 'tax'
    | 'investment'
    | 'protection'
    | 'objectives'
    | 'documents'
    | 'global'
}

export type DiscoveryCompletenessSection = {
  key: string
  label: string
  isComplete: boolean
}

export type DiscoveryCompleteness = {
  score: number
  isComplete: boolean
  sections: DiscoveryCompletenessSection[]
  nextAction: string
}
