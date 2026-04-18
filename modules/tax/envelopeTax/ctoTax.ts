export function computeCtoNetGain(grossGain: number, pfuTotalRate: number) {
  const tax = grossGain * pfuTotalRate
  return {
    grossGain,
    tax,
    netGain: grossGain - tax,
  }
}
