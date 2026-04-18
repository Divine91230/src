import type { FranceTaxParameters } from './taxParameters/france_2026'

export function computeIncomeTax(taxableIncome: number, taxParts: number, params: FranceTaxParameters) {
  const safeParts = Math.max(taxParts, 1)
  const taxablePerPart = taxableIncome / safeParts
  let previousCap = 0
  let taxPerPart = 0

  for (const bracket of params.incomeTaxBrackets) {
    const cap = bracket.upTo ?? taxablePerPart
    const taxableSlice = Math.max(Math.min(taxablePerPart, cap) - previousCap, 0)
    taxPerPart += taxableSlice * bracket.rate
    previousCap = cap

    if (bracket.upTo === null || taxablePerPart <= cap) {
      break
    }
  }

  const tax = taxPerPart * safeParts
  const averageRate = taxableIncome > 0 ? tax / taxableIncome : 0
  const marginalRate = [...params.incomeTaxBrackets]
    .reverse()
    .find((bracket, index, list) => {
      const normalOrder = [...list].reverse()
      const position = normalOrder.findIndex((item) => item.rate === bracket.rate && item.upTo === bracket.upTo)
      const lowerBound = position === 0 ? 0 : normalOrder[position - 1]!.upTo ?? 0
      return taxablePerPart > lowerBound
    })?.rate ?? 0

  return {
    tax: Math.round(tax),
    averageRate,
    marginalRate,
  }
}
