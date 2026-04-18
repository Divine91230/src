import type { ClientSnapshot } from '../../domain/types/patrimony'
import type { ClientScoreItem, ClientScoringResult, ScoreTone } from './scoring.types'

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(value)))
}

function toneFromScore(value: number): ScoreTone {
  if (value >= 70) return 'good'
  if (value >= 45) return 'warning'
  return 'danger'
}

function buildSummary(label: string, value: number) {
  if (value >= 70) return `${label} bien orienté à ce stade.`
  if (value >= 45) return `${label} à consolider pour améliorer la cohérence d'ensemble.`
  return `${label} fragile ou insuffisant au regard du dossier.`
}

export function buildClientScoring(input: ClientSnapshot): ClientScoringResult {
  const income = Math.max(input.budget.monthlyNetIncome, 1)
  const expenses = Math.max(input.budget.monthlyFixedExpenses, 0)
  const savings = Math.max(input.budget.monthlySavingsCapacity, 0)
  const debtStock = input.liabilities.mortgage + input.liabilities.consumerDebt + input.liabilities.otherDebt
  const grossAssets = Object.values(input.assets).reduce((sum, value) => sum + value, 0)
  const liquidities = Math.max(input.assets.liquidities, 0)
  const financial = Math.max(input.assets.financial, 0)
  const realEstate = Math.max(input.assets.realEstate, 0)
  const emergencyMonths = liquidities / Math.max(expenses, 1)
  const debtRatio = expenses / income
  const realEstateWeight = grossAssets > 0 ? realEstate / grossAssets : 0
  const financialWeight = grossAssets > 0 ? financial / grossAssets : 0
  const hasChildren = input.household.childrenCount > 0
  const isCouple = input.household.maritalStatus === 'MARIE' || input.household.maritalStatus === 'PACSE'

  const security = clamp(emergencyMonths * 14 + (savings > 0 ? 16 : 0) - debtRatio * 25)
  const liquidity = clamp(emergencyMonths * 16 + (grossAssets > 0 ? (liquidities / grossAssets) * 35 : 0))
  const diversification = clamp(financialWeight * 65 + (1 - realEstateWeight) * 35)
  const retirement = clamp(
    (input.goals.includes('RETRAITE') ? 35 : 15) +
    Math.min(30, savings / 40) +
    (input.age < 55 ? 20 : 10)
  )

  // ─── Score Protection — basé sur les vraies données de prévoyance ──────────
  // Si les données protection sont disponibles (section remplie en découverte),
  // on calcule un score précis. Sinon, on utilise l'estimation par défaut.
  let protection: number

  if (input.protection) {
    const p = input.protection
    let score = 0

    // Base : couverture décès (fondamentale)
    if (p.hasDeathCoverage) score += 25
    else score -= 10

    // Couverture invalidité (souvent sous-estimée, très impactante)
    if (p.hasDisabilityCoverage) score += 30
    // Pénalité forte si pas de couverture invalidité
    // (risque financier > risque décès sur patrimoine en construction)
    else score -= 15

    // Assurance emprunteur (obligatoire en pratique si crédit)
    if (p.hasBorrowerInsurance) score += 10

    // Protection du conjoint (critique si couple)
    if (isCouple) {
      if (p.spouseProtected) score += 20
      else score -= 10
    } else {
      score += 10 // célibataire → pas d'enjeu conjoint
    }

    // Protection des enfants / personnes à charge
    if (hasChildren) {
      if (p.dependantsProtected) score += 15
      else score -= 10
    } else {
      score += 10 // pas d'enfants → pas d'enjeu
    }

    // Bonus si protection exprimée comme objectif
    if (input.goals.includes('PROTECTION')) score += 10

    protection = clamp(score)
  } else {
    // Estimation par défaut si section protection non remplie
    protection = clamp(
      (hasChildren ? 35 : 55) +
      (input.goals.includes('PROTECTION') ? 20 : 0)
    )
  }

  const tax = clamp(
    (input.marginalTaxRate >= 0.3 ? 70 : input.marginalTaxRate >= 0.11 ? 55 : 35) +
    (input.goals.includes('RETRAITE') ? 10 : 0)
  )

  const transmission = clamp(
    (input.goals.includes('TRANSMISSION') ? 70 : 40) +
    (hasChildren ? 15 : 0)
  )

  const debt = clamp(100 - debtRatio * 160 - (debtStock > 0 ? 10 : 0))

  const items: ClientScoreItem[] = [
    { code: 'SECURITY', label: 'Sécurité patrimoniale', value: security, tone: toneFromScore(security), summary: buildSummary('La sécurité patrimoniale', security) },
    { code: 'LIQUIDITY', label: 'Liquidité', value: liquidity, tone: toneFromScore(liquidity), summary: buildSummary('La liquidité', liquidity) },
    { code: 'DIVERSIFICATION', label: 'Diversification', value: diversification, tone: toneFromScore(diversification), summary: buildSummary('La diversification', diversification) },
    { code: 'RETIREMENT', label: 'Préparation retraite', value: retirement, tone: toneFromScore(retirement), summary: buildSummary('La préparation retraite', retirement) },
    { code: 'PROTECTION', label: 'Protection familiale', value: protection, tone: toneFromScore(protection), summary: buildSummary('La protection familiale', protection) },
    { code: 'TAX', label: 'Optimisation fiscale', value: tax, tone: toneFromScore(tax), summary: buildSummary('L\u2019optimisation fiscale', tax) },
    { code: 'TRANSMISSION', label: 'Transmission', value: transmission, tone: toneFromScore(transmission), summary: buildSummary('La logique de transmission', transmission) },
    { code: 'DEBT', label: 'Endettement', value: debt, tone: toneFromScore(debt), summary: buildSummary('Le niveau d\u2019endettement', debt) },
  ]

  const globalScore = clamp(items.reduce((sum, item) => sum + item.value, 0) / items.length)
  return { globalScore, items }
}
