import { FRANCE_TAX_2026 } from './taxParameters/france_2026'
import { computeIncomeTax } from './incomeTax'
import { computeCtoNetGain } from './envelopeTax/ctoTax'
import { computePeaNetGain } from './envelopeTax/peaTax'
import { computeAssuranceVieRachatTax } from './envelopeTax/assuranceVieTax'
import { estimatePerDeductionImpact, estimatePerDeductionCeiling } from './envelopeTax/perTax'

export const TaxEngine = {
  estimateHouseholdIncomeTax(taxableIncome: number, taxParts: number) {
    return computeIncomeTax(taxableIncome, taxParts, FRANCE_TAX_2026)
  },

  estimateCtoNetGain(grossGain: number) {
    return computeCtoNetGain(grossGain, FRANCE_TAX_2026.pfuTotalRate)
  },

  estimatePeaNetGain(grossGain: number, holdingYears: number) {
    return computePeaNetGain(grossGain, FRANCE_TAX_2026.socialContributionsRate, holdingYears)
  },

  estimateAssuranceVieRachat(taxableGainPortion: number, isCouple: boolean) {
    return computeAssuranceVieRachatTax({
      taxableGainPortion,
      annualAllowance: isCouple
        ? FRANCE_TAX_2026.assuranceVie.annualAllowanceCouple
        : FRANCE_TAX_2026.assuranceVie.annualAllowanceSingle,
      socialContributionsRate: FRANCE_TAX_2026.socialContributionsRate,
    })
  },

  // ─── PER : plafond corrigé ────────────────────────────────────────────────
  // annualProfessionalIncome : revenus professionnels N-1 du client
  // Si non fournis → plancher légal 2026 (4 637 €)
  estimatePerContribution(
    annualContribution: number,
    marginalTaxRate: number,
    annualProfessionalIncome?: number,
  ) {
    return estimatePerDeductionImpact(
      annualContribution,
      marginalTaxRate,
      annualProfessionalIncome,
    )
  },

  // Utilitaire : calcule uniquement le plafond sans simuler de versement
  estimatePerDeductionCeiling(annualProfessionalIncome?: number) {
    return estimatePerDeductionCeiling(annualProfessionalIncome)
  },
}
