import { simulateLifeInsuranceWithdrawal } from '../simulators/lifeInsurance/lifeInsuranceExitSimulator'
import { simulateCapitalisationWithdrawal } from '../simulators/capitalisation/capitalisationExitSimulator'
import type { FundingSourceInput, FundingSourceReview } from './liquidity.types'

function round(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export function buildFundingSourceComparison(
  sources: FundingSourceInput[],
  requestedAmount: number,
): FundingSourceReview[] {
  return sources
    .filter((source) => source.contractValue > 0)
    .map((source) => {
      const availableAmount = Math.max(
        0,
        Math.min(source.availableAmount ?? source.contractValue, source.contractValue),
      )
      const simulatedAmount = Math.min(Math.max(requestedAmount, 0), availableAmount)

      let estimatedTax = 0
      let estimatedNet = simulatedAmount
      let taxVigilance: FundingSourceReview['taxVigilance'] = 'Faible'
      let patrimonialVigilance: FundingSourceReview['patrimonialVigilance'] = 'Faible'
      let advisorReading = 'Mobilisation simple à ce stade.'
      let recommendation: FundingSourceReview['recommendation'] = 'À privilégier'

      if (source.type === 'ASSURANCE_VIE') {
        const simulation = simulateLifeInsuranceWithdrawal({
          contractValue: source.contractValue,
          totalContributions: source.totalContributions ?? source.contractValue,
          requestedGrossWithdrawal: simulatedAmount,
          holdingYears: source.holdingYears ?? 0,
          isCouple: source.isCouple ?? false,
        })
        estimatedTax = simulation.totalTax
        estimatedNet = simulation.netWithdrawal
        taxVigilance = simulation.effectiveTaxRate > 0.12 ? 'Modérée' : 'Faible'
        patrimonialVigilance = source.strategicRole ? 'Modérée' : 'Faible'
        advisorReading = 'Rachat possible avec fiscalité concentrée sur la quote-part de produits du retrait.'
        recommendation = source.strategicRole ? 'Mobilisable partiellement' : 'À privilégier'
      } else if (source.type === 'CAPITALISATION') {
        const simulation = simulateCapitalisationWithdrawal({
          contractValue: source.contractValue,
          totalContributions: source.totalContributions ?? source.contractValue,
          requestedGrossWithdrawal: simulatedAmount,
          holdingYears: source.holdingYears ?? 0,
          isCouple: source.isCouple ?? false,
        })
        estimatedTax = simulation.totalTax
        estimatedNet = simulation.netWithdrawal
        taxVigilance = simulation.effectiveTaxRate > 0.12 ? 'Modérée' : 'Faible'
        patrimonialVigilance = 'Modérée'
        advisorReading = 'Retrait techniquement mobilisable, à arbitrer selon l’usage patrimonial du contrat.'
        recommendation = 'Mobilisable partiellement'
      } else if (source.type === 'PER') {
        estimatedTax = simulatedAmount * 0.25
        estimatedNet = simulatedAmount - estimatedTax
        taxVigilance = 'Élevée'
        patrimonialVigilance = 'Élevée'
        advisorReading = 'Sortie généralement à éviter hors cas spécifique, car elle peut casser l’objectif retraite et entraîner une fiscalité sensible.'
        recommendation = 'À éviter dans l’immédiat'
      } else if (source.type === 'SCPI') {
        estimatedTax = simulatedAmount * 0.05
        estimatedNet = simulatedAmount - estimatedTax
        taxVigilance = 'Modérée'
        patrimonialVigilance = 'Élevée'
        advisorReading = 'Mobilisation moins fluide et plus contraignante. À réserver aux besoins bien confirmés.'
        recommendation = 'À arbitrer avec prudence'
      } else if (source.type === 'PEA') {
        estimatedTax = source.holdingYears && source.holdingYears >= 5 ? simulatedAmount * 0.03 : simulatedAmount * 0.12
        estimatedNet = simulatedAmount - estimatedTax
        taxVigilance = source.holdingYears && source.holdingYears >= 5 ? 'Faible' : 'Modérée'
        patrimonialVigilance = 'Modérée'
        advisorReading = 'Retrait à confronter à l’intérêt de conserver la poche actions long terme.'
        recommendation = 'Mobilisable partiellement'
      } else if (source.type === 'CTO') {
        estimatedTax = simulatedAmount * 0.1
        estimatedNet = simulatedAmount - estimatedTax
        taxVigilance = 'Modérée'
        patrimonialVigilance = 'Modérée'
        advisorReading = 'Mobilisation souple mais fiscalité des gains à intégrer dans l’arbitrage.'
        recommendation = 'À arbitrer avec prudence'
      } else if (source.type === 'CASH') {
        estimatedTax = 0
        estimatedNet = simulatedAmount
        taxVigilance = 'Faible'
        patrimonialVigilance = source.strategicRole ? 'Modérée' : 'Faible'
        advisorReading = 'Liquidité immédiatement disponible. À utiliser en priorité si cela ne dégrade pas la réserve de sécurité du foyer.'
        recommendation = source.strategicRole ? 'Mobilisable partiellement' : 'À privilégier'
      }

      return {
        id: source.id,
        label: source.label,
        type: source.type,
        availableAmount: round(availableAmount),
        estimatedTax: round(estimatedTax),
        estimatedNet: round(estimatedNet),
        taxVigilance,
        patrimonialVigilance,
        advisorReading,
        recommendation,
      }
    })
    .sort((a, b) => b.estimatedNet - a.estimatedNet)
}
