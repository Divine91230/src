export function computeAssuranceVieRachatTax(options: {
  taxableGainPortion: number
  annualAllowance: number
  socialContributionsRate: number
  irRateAfter8Years?: number
}) {
  const taxableAfterAllowance = Math.max(options.taxableGainPortion - options.annualAllowance, 0)
  const incomeTax = taxableAfterAllowance * (options.irRateAfter8Years ?? 0.075)
  const social = options.taxableGainPortion * options.socialContributionsRate
  const totalTax = incomeTax + social

  return {
    taxableAfterAllowance,
    incomeTax,
    social,
    totalTax,
  }
}
