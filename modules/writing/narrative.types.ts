import type { AdviceJustification } from '../justification/justification.types'

export type NarrativeBlock = {
  title: string
  paragraphs: string[]
}

export type RecommendationNarrative = {
  executiveSummary: string
  blocks: NarrativeBlock[]
  justifications: AdviceJustification[]
}
