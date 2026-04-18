export function computePeaNetGain(grossGain: number, socialContributionsRate: number, holdingYears: number) {
  if (holdingYears < 5) {
    const tax = grossGain * (0.128 + socialContributionsRate)
    return { grossGain, tax, netGain: grossGain - tax }
  }

  const tax = grossGain * socialContributionsRate
  return { grossGain, tax, netGain: grossGain - tax }
}
