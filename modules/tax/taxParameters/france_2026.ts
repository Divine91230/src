export type IncomeTaxBracket = {
  upTo: number | null
  rate: number
}

export type FranceTaxParameters = {
  taxYear: number
  incomeTaxBrackets: IncomeTaxBracket[]
  socialContributionsRate: number
  pfuIncomeTaxRate: number
  pfuTotalRate: number
  assuranceVie: {
    annualAllowanceSingle: number
    annualAllowanceCouple: number
  }
  per: {
    annualDeductionFloor: number
    // Plafond PER = 10 % des revenus professionnels N-1
    // dans la limite de 8 x le PASS 2026 (PASS 2026 = 46 368 €)
    // → plafond max = 46 368 × 8 × 10 % = 37 094 €
    // Le plancher légal reste 10 % du PASS = 4 637 €
    annualDeductionRateOnIncome: number  // 10 %
    annualDeductionCeiling: number       // 37 094 € (8 × PASS × 10 %)
    passValue: number                    // PASS 2026 = 46 368 €
  }
}

export const FRANCE_TAX_2026: FranceTaxParameters = {
  taxYear: 2026,
  incomeTaxBrackets: [
    { upTo: 11497, rate: 0 },
    { upTo: 29315, rate: 0.11 },
    { upTo: 83823, rate: 0.3 },
    { upTo: 180294, rate: 0.41 },
    { upTo: null, rate: 0.45 },
  ],
  socialContributionsRate: 0.172,
  pfuIncomeTaxRate: 0.128,
  pfuTotalRate: 0.3,
  assuranceVie: {
    annualAllowanceSingle: 4600,
    annualAllowanceCouple: 9200,
  },
  per: {
    annualDeductionFloor: 4637,           // 10 % du PASS 2026 (plancher légal)
    annualDeductionRateOnIncome: 0.10,    // 10 % des revenus professionnels N-1
    annualDeductionCeiling: 37094,        // 8 × PASS 2026 × 10 %
    passValue: 46368,                     // PASS 2026
  },
}
