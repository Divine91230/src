import { FRANCE_TAX_2026 } from '../taxParameters/france_2026'

// ─── estimatePerDeductionCeiling ──────────────────────────────────────────────
// Calcule le plafond de déduction PER réel du client selon la règle 2026 :
//   → 10 % des revenus professionnels N-1
//   → Plancher : 10 % du PASS = 4 637 €
//   → Plafond max : 8 × PASS × 10 % = 37 094 €
//
// Si les revenus annuels ne sont pas fournis, on utilise le plancher légal.
export function estimatePerDeductionCeiling(annualProfessionalIncome?: number): {
  ceiling: number
  basis: 'income' | 'floor' | 'capped'
  detail: string
} {
  const { annualDeductionFloor, annualDeductionRateOnIncome, annualDeductionCeiling } =
    FRANCE_TAX_2026.per

  if (!annualProfessionalIncome || annualProfessionalIncome <= 0) {
    return {
      ceiling: annualDeductionFloor,
      basis: 'floor',
      detail: `Plafond plancher retenu : ${annualDeductionFloor.toLocaleString('fr-FR')} € (10 % du PASS 2026 — revenus non renseignés)`,
    }
  }

  const computed = annualProfessionalIncome * annualDeductionRateOnIncome

  if (computed <= annualDeductionFloor) {
    return {
      ceiling: annualDeductionFloor,
      basis: 'floor',
      detail: `Plafond plancher retenu : ${annualDeductionFloor.toLocaleString('fr-FR')} € (10 % des revenus inférieur au plancher légal)`,
    }
  }

  if (computed >= annualDeductionCeiling) {
    return {
      ceiling: annualDeductionCeiling,
      basis: 'capped',
      detail: `Plafond maximum retenu : ${annualDeductionCeiling.toLocaleString('fr-FR')} € (plafond légal 2026 = 8 × PASS × 10 %)`,
    }
  }

  return {
    ceiling: Math.round(computed),
    basis: 'income',
    detail: `Plafond calculé : ${Math.round(computed).toLocaleString('fr-FR')} € (10 % de ${annualProfessionalIncome.toLocaleString('fr-FR')} € de revenus professionnels N-1)`,
  }
}

// ─── estimatePerDeductionImpact ───────────────────────────────────────────────
// Calcule l'économie fiscale réelle d'un versement PER.
//
// Paramètres :
//   annualContribution     : versement annuel envisagé
//   marginalTaxRate        : TMI du client (ex : 0.30 pour 30 %)
//   annualProfessionalIncome : revenus professionnels N-1 pour calculer le vrai plafond
//                             (optionnel — si absent, on utilise le plancher légal)
export function estimatePerDeductionImpact(
  annualContribution: number,
  marginalTaxRate: number,
  annualProfessionalIncome?: number,
) {
  const { ceiling, basis, detail } = estimatePerDeductionCeiling(annualProfessionalIncome)

  const deductibleContribution = Math.min(annualContribution, ceiling)
  const nonDeductibleContribution = Math.max(annualContribution - deductibleContribution, 0)
  const taxSaving = Math.round(deductibleContribution * marginalTaxRate)
  const netEffort = annualContribution - taxSaving

  return {
    deductibleContribution: Math.round(deductibleContribution),
    nonDeductibleContribution: Math.round(nonDeductibleContribution),
    taxSaving,
    netEffort: Math.round(netEffort),
    ceiling,
    ceilingBasis: basis,
    ceilingDetail: detail,
    // Indicateur : est-ce que le versement dépasse le plafond ?
    exceedsCeiling: annualContribution > ceiling,
    // Taux d'effort net réel (coût réel après déduction / versement brut)
    effectiveEffortRate:
      annualContribution > 0
        ? Number(((annualContribution - taxSaving) / annualContribution).toFixed(3))
        : 1,
  }
}
