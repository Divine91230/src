import type { ClientSnapshot } from '../../domain/types/patrimony'
import type { ClientScoringResult } from '../scoring/scoring.types'
import type { PriorityItem } from './priorities.types'

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(value)))
}

export function buildPriorityPlan(input: ClientSnapshot, scoring: ClientScoringResult): PriorityItem[] {
  const getScore = (code: string) => scoring.items.find((item) => item.code === code)?.value ?? 50
  const emergencyFundPriority = clamp(100 - getScore('LIQUIDITY'))
  const protectionPriority = clamp(100 - getScore('PROTECTION'))
  const debtPriority = clamp(100 - getScore('DEBT'))
  const diversificationPriority = clamp(100 - getScore('DIVERSIFICATION'))
  const taxPriority = clamp(100 - getScore('TAX') + (input.marginalTaxRate >= 0.3 ? 10 : 0))
  const retirementPriority = clamp(100 - getScore('RETIREMENT') + (input.goals.includes('RETRAITE') ? 12 : 0))
  const transmissionPriority = clamp(100 - getScore('TRANSMISSION') + (input.goals.includes('TRANSMISSION') ? 12 : 0))

  const items: PriorityItem[] = [
    { step: 'SECURISER', title: 'Sécuriser les fondamentaux', summary: 'Consolider réserve, budget et marges de manœuvre avant d’augmenter la complexité du conseil.', score: emergencyFundPriority },
    { step: 'PROTEGER', title: 'Protéger le foyer', summary: 'Valider la protection du conjoint, des enfants et la continuité financière en cas d’aléa.', score: protectionPriority },
    { step: 'ASSAINIR', title: 'Assainir la structure', summary: 'Réduire les fragilités budgétaires et l’endettement si cela pèse sur la stratégie.', score: debtPriority },
    { step: 'DIVERSIFIER', title: 'Diversifier le patrimoine', summary: 'Rééquilibrer le poids des classes d’actifs et renforcer la souplesse patrimoniale.', score: diversificationPriority },
    { step: 'OPTIMISER', title: 'Optimiser la fiscalité', summary: 'Mobiliser les leviers fiscaux seulement lorsqu’ils restent cohérents avec le reste du dossier.', score: taxPriority },
    { step: 'PREPARER', title: 'Préparer les objectifs long terme', summary: 'Structurer retraite, capitalisation et efforts réguliers dans un cadre soutenable.', score: retirementPriority },
    { step: 'TRANSMETTRE', title: 'Préparer la transmission', summary: 'Organiser la transmission quand le dossier s’y prête et que les fondamentaux sont stabilisés.', score: transmissionPriority },
  ]

  return items.sort((a, b) => b.score - a.score)
}
