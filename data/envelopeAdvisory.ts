import type { ContractEnvelope } from './contractsCatalog'

export function getEnvelopeAdvisoryBucket(level: 'Socle' | 'Complémentaire' | 'Optionnelle') {
  if (level === 'Socle') return 'Enveloppes socles'
  if (level === 'Complémentaire') return 'Enveloppes complémentaires'
  return 'Solutions optionnelles ou techniques'
}

export function shouldDownrankCapitalisationForStandardCase(
  envelope: ContractEnvelope,
  context: { objective: string; baseInitialCapital: number; emergencyMonths: number },
) {
  if (envelope !== 'Contrat de capitalisation') return false
  const objective = (context.objective || '').toLowerCase()
  return !objective.includes('transmis') && context.baseInitialCapital < 100000 && context.emergencyMonths < 12
}
