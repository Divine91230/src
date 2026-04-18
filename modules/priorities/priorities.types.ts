export type PriorityStep =
  | 'SECURISER'
  | 'PROTEGER'
  | 'ASSAINIR'
  | 'DIVERSIFIER'
  | 'OPTIMISER'
  | 'PREPARER'
  | 'TRANSMETTRE'

export type PriorityItem = {
  step: PriorityStep
  title: string
  summary: string
  score: number
}
