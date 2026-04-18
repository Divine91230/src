import type { ContractEnvelope } from '../../data/contractsCatalog'
import type { ResolvedEnvelopeAllocation } from '../../lib/allocationMapping'

export type EnvelopeCardLevel = 'Socle' | 'Complémentaire' | 'Optionnelle'

export type EnvelopeCardItem = {
  envelope: ContractEnvelope
  displayLabel: string
  level: EnvelopeCardLevel
  role: string
  supportPrimary: string
  supportSecondary: string
  narrative: string
  watchout: string
  allocationLine?: ResolvedEnvelopeAllocation
  primaryContract?: string
  alternativeContract?: string
}

export function groupEnvelopeItems(items: EnvelopeCardItem[]) {
  return {
    socle: items.filter((item) => item.level === 'Socle'),
    complementary: items.filter((item) => item.level === 'Complémentaire'),
    optional: items.filter((item) => item.level === 'Optionnelle'),
  }
}
