import { FRANCE_TAX_2026 } from '../../tax/taxParameters/france_2026'
import type { WithdrawalSimulationInput, WithdrawalSimulationResult } from '../common/withdrawal.types'

function round(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export function simulateLifeInsuranceWithdrawal(
  input: WithdrawalSimulationInput,
): WithdrawalSimulationResult {
  const contractValue = Math.max(Number(input.contractValue || 0), 0)
  const contributions = Math.max(Number(input.totalContributions || 0), 0)
  const requested = Math.max(Number(input.requestedGrossWithdrawal || 0), 0)
  const gains = Math.max(contractValue - contributions, 0)
  const gainRatio = contractValue > 0 ? gains / contractValue : 0
  const gainPortion = requested * gainRatio
  const contributionPortion = Math.max(requested - gainPortion, 0)

  const allowance = input.holdingYears >= 8
    ? (input.isCouple
        ? FRANCE_TAX_2026.assuranceVie.annualAllowanceCouple
        : FRANCE_TAX_2026.assuranceVie.annualAllowanceSingle)
    : 0

  const taxableGainAfterAllowance = Math.max(gainPortion - allowance, 0)
  const incomeTaxRate = input.holdingYears >= 8 ? 0.075 : FRANCE_TAX_2026.pfuIncomeTaxRate
  const incomeTax = taxableGainAfterAllowance * incomeTaxRate
  const socialContributions = gainPortion * FRANCE_TAX_2026.socialContributionsRate
  const totalTax = incomeTax + socialContributions
  const netWithdrawal = Math.max(requested - totalTax, 0)

  const notes: string[] = []
  if (input.holdingYears >= 8) {
    notes.push('Contrat de plus de 8 ans : abattement annuel pris en compte dans la simulation.')
  } else {
    notes.push('Contrat de moins de 8 ans : simulation sans abattement annuel.')
  }
  notes.push('La quote-part imposable porte uniquement sur les produits inclus dans le rachat.')

  return {
    requestedGrossWithdrawal: round(requested),
    contributionPortion: round(contributionPortion),
    gainPortion: round(gainPortion),
    allowanceUsed: round(Math.min(gainPortion, allowance)),
    taxableGainAfterAllowance: round(taxableGainAfterAllowance),
    incomeTax: round(incomeTax),
    socialContributions: round(socialContributions),
    totalTax: round(totalTax),
    netWithdrawal: round(netWithdrawal),
    effectiveTaxRate: requested > 0 ? round(totalTax / requested) : 0,
    notes,
  }
}
