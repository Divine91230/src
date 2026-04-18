import type {
  AssetLine,
  ChargeLine,
  DiscoveryFormState,
  LinkedPerson,
  RevenueLine,
  RiskLevel,
} from './discovery.types'
import { resolveManualNumber, resolveManualText } from '../../lib/core/fallbacks'
import {
  hasPositiveNumber,
  toPositiveOrZero,
  toSafeNumber as coreToSafeNumber,
} from '../../lib/core/number'
import { hasMeaningfulText } from '../../lib/core/text'

export type ValueOrigin = 'auto' | 'manual' | 'incomplete'

export function generateId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`
}

export function calculateAge(birthDate: string) {
  if (!birthDate) return null
  const birth = new Date(birthDate)
  if (Number.isNaN(birth.getTime())) return null

  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1
  }

  return age
}

export function toSafeNumber(value: unknown, fallback = 0) {
  return coreToSafeNumber(value, fallback)
}

export function formatResolvedPercent(value: unknown) {
  const text = String(value ?? '').trim()
  if (text.endsWith('%')) return text
  return `${toSafeNumber(value, 0)} %`
}

export function getIncludedRevenueLines(revenues: RevenueLine[]) {
  return (revenues ?? []).filter(
    (line) => line.includedInBudget && toPositiveOrZero(line.monthlyAmount) > 0,
  )
}

export function getIncludedChargeLines(charges: ChargeLine[]) {
  return (charges ?? []).filter(
    (line) => line.includedInBudget && toPositiveOrZero(line.monthlyAmount) > 0,
  )
}

export function getIncludedRevenueTotal(revenues: RevenueLine[]) {
  return getIncludedRevenueLines(revenues).reduce(
    (sum, line) => sum + toPositiveOrZero(line.monthlyAmount),
    0,
  )
}

export function getIncludedChargesTotal(charges: ChargeLine[]) {
  return getIncludedChargeLines(charges).reduce(
    (sum, line) => sum + toPositiveOrZero(line.monthlyAmount),
    0,
  )
}

export function getSelectedHouseholdIncome(state: DiscoveryFormState) {
  return resolveManualNumber({
    mode: state.budgetOverrides.householdIncomeMode,
    autoValue: getIncludedRevenueTotal(state.revenues),
    manualValue: state.budgetOverrides.householdIncomeManual,
  }).value
}

export function getSelectedHouseholdIncomeOrigin(state: DiscoveryFormState): ValueOrigin {
  return resolveManualNumber({
    mode: state.budgetOverrides.householdIncomeMode,
    autoValue: getIncludedRevenueTotal(state.revenues),
    manualValue: state.budgetOverrides.householdIncomeManual,
  }).origin
}

export function getSelectedCharges(state: DiscoveryFormState) {
  return resolveManualNumber({
    mode: state.budgetOverrides.chargesMode,
    autoValue: getIncludedChargesTotal(state.charges),
    manualValue: state.budgetOverrides.chargesManual,
  }).value
}

export function getSelectedChargesOrigin(state: DiscoveryFormState): ValueOrigin {
  return resolveManualNumber({
    mode: state.budgetOverrides.chargesMode,
    autoValue: getIncludedChargesTotal(state.charges),
    manualValue: state.budgetOverrides.chargesManual,
  }).origin
}

export function getRemainingToLive(state: DiscoveryFormState) {
  return getSelectedHouseholdIncome(state) - getSelectedCharges(state)
}

export function getRemainingToLiveOrigin(state: DiscoveryFormState): ValueOrigin {
  const incomeOrigin = getSelectedHouseholdIncomeOrigin(state)
  const chargesOrigin = getSelectedChargesOrigin(state)

  if (incomeOrigin === 'incomplete' || chargesOrigin === 'incomplete') return 'incomplete'
  if (incomeOrigin === 'manual' || chargesOrigin === 'manual') return 'manual'
  return 'auto'
}

export function getSuggestedSavingsCapacity(state: DiscoveryFormState) {
  const remaining = getRemainingToLive(state)
  return Math.max(0, Math.round(remaining * 0.65))
}

export function getSelectedSavingsCapacity(state: DiscoveryFormState) {
  return resolveManualNumber({
    mode: state.budgetOverrides.capacityMode,
    autoValue: getSuggestedSavingsCapacity(state),
    manualValue: state.budgetOverrides.capacityManual,
  }).value
}

export function getSelectedSavingsCapacityOrigin(state: DiscoveryFormState): ValueOrigin {
  if (getRemainingToLiveOrigin(state) === 'incomplete' && state.budgetOverrides.capacityMode === 'auto') {
    return 'incomplete'
  }

  return resolveManualNumber({
    mode: state.budgetOverrides.capacityMode,
    autoValue: getSuggestedSavingsCapacity(state),
    manualValue: state.budgetOverrides.capacityManual,
  }).origin
}

export function getTotalAssets(assets: AssetLine[]) {
  return (assets ?? []).reduce((sum, line) => sum + toPositiveOrZero(line.amount), 0)
}

export function getTotalLiabilitiesCapital(state: DiscoveryFormState) {
  return (state?.liabilities ?? []).reduce(
    (sum, line) => sum + toPositiveOrZero(line.outstandingCapital),
    0,
  )
}

export function getLiquidAssetsTotal(assets: AssetLine[]) {
  return (assets ?? [])
    .filter((line) => line.category === 'Liquidités')
    .reduce((sum, line) => sum + toPositiveOrZero(line.amount), 0)
}

export function getEmergencyFundMonths(state: DiscoveryFormState) {
  const charges = getSelectedCharges(state)
  if (charges <= 0) return 0
  return getLiquidAssetsTotal(state.assets) / charges
}

export function getDependentChildrenCount(state: DiscoveryFormState) {
  const auto = (state.linkedPersons ?? []).filter(
    (person) => person.role === 'Enfant' && (person.isDependent || person.isTaxAttached),
  ).length

  return state.tax.useDependentChildrenOverride
    ? Math.max(0, Math.round(toSafeNumber(state.tax.numberOfDependentChildrenManual, 0)))
    : auto
}

export function getDependentChildrenCountOrigin(state: DiscoveryFormState): ValueOrigin {
  if (!state.tax.useDependentChildrenOverride) return 'auto'
  return state.tax.numberOfDependentChildrenManual === '' ? 'incomplete' : 'manual'
}

export function estimateTaxSituation(state: DiscoveryFormState) {
  const status = state.mainPerson.householdStatus

  if (status === 'Marié(e)' || status === 'Pacsé(e)') {
    return 'Couple - imposition commune probable'
  }

  if (status === 'Concubinage') {
    return 'Concubinage - impositions distinctes probables'
  }

  if (status === 'Divorcé(e)') {
    return 'Personne seule / parent isolé selon rattachement'
  }

  if (status === 'Veuf / Veuve') {
    return 'Veuf / Veuve'
  }

  return 'Personne seule'
}

export function estimateTaxParts(state: DiscoveryFormState) {
  const householdStatus = state.mainPerson.householdStatus
  const dependants = getDependentChildrenCount(state)
  const isCouple = householdStatus === 'Marié(e)' || householdStatus === 'Pacsé(e)'

  let parts = isCouple ? 2 : 1
  if (dependants >= 1) parts += 0.5
  if (dependants >= 2) parts += 0.5
  if (dependants >= 3) parts += dependants - 2

  return parts
}

export function estimateTaxableIncomeAnnual(state: DiscoveryFormState) {
  // Les revenus sont saisis en "net avant IR" (net avant prélèvement à la source).
  // Ce montant correspond au salaire net après cotisations sociales mais avant IR.
  // Pour estimer le revenu fiscal de référence (base du barème IR), on remonte
  // au brut fiscal en divisant par 0.78 (approximation : net avant IR ≈ 78 % du brut
  // pour un salarié standard), puis on applique l'abattement forfaitaire de 10 %
  // pour frais professionnels (plafonné à 14 157 € en 2026).
  //
  // Cette estimation reste indicative — le mode manuel reste prioritaire.

  const revenues = state.revenues ?? []
  let salaryNetBeforeTax = 0
  let otherRevenues = 0

  for (const line of revenues) {
    if (!line.includedInBudget) continue
    const amount = toSafeNumber(line.monthlyAmount, 0) * 12

    if (line.type === 'Salaire net avant IR') {
      // Remontée au brut fiscal : net avant IR ÷ 0.78
      const estimatedBrut = amount / 0.78
      // Abattement 10 % plafonné à 14 157 € (2026)
      const allowance = Math.min(estimatedBrut * 0.1, 14157)
      salaryNetBeforeTax += Math.max(0, estimatedBrut - allowance)
    } else if (line.type === 'Revenu TNS net estimé') {
      // TNS : revenu net estimé ≈ déjà proche du revenu imposable
      // On applique un abattement forfaitaire de 10 % (option réelle possible)
      const allowance = Math.min(amount * 0.1, 14157)
      salaryNetBeforeTax += Math.max(0, amount - allowance)
    } else if (
      line.type === 'Pension / retraite nette' ||
      line.type === 'Pension alimentaire reçue'
    ) {
      // Pensions : abattement 10 % plafonné à 4 321 € (2026)
      const estimatedBrut = amount / 0.9
      const allowance = Math.min(estimatedBrut * 0.1, 4321)
      otherRevenues += Math.max(0, estimatedBrut - allowance)
    } else if (line.type === 'Revenus locatifs encaissés') {
      // Revenus fonciers : imposés sur le net (après charges réelles ou micro-foncier 30 %)
      // On retient 70 % comme approximation du régime micro-foncier
      otherRevenues += Math.round(amount * 0.7)
    } else {
      // Autres revenus : retenus tels quels
      otherRevenues += amount
    }
  }

  const total = salaryNetBeforeTax + otherRevenues
  if (total <= 0) return 0
  return Math.round(total)
}

export function estimateTmiLabel(state: DiscoveryFormState) {
  const taxableIncome = estimateTaxableIncomeAnnual(state)
  const parts = Math.max(1, estimateTaxParts(state))
  const quotient = taxableIncome / parts

  // Barème IR 2026
  if (quotient <= 11497) return '0 %'
  if (quotient <= 29315) return '11 %'
  if (quotient <= 83823) return '30 %'
  if (quotient <= 180294) return '41 %'
  return '45 %'
}

export function getResolvedTaxSituation(state: DiscoveryFormState) {
  return resolveManualText({
    mode: state.tax.situationFiscaleMode,
    autoValue: estimateTaxSituation(state),
    manualValue: state.tax.taxSituationManual,
  }).value
}

export function getTaxSituationOrigin(state: DiscoveryFormState): ValueOrigin {
  return resolveManualText({
    mode: state.tax.situationFiscaleMode,
    autoValue: estimateTaxSituation(state),
    manualValue: state.tax.taxSituationManual,
  }).origin
}

export function getResolvedTaxParts(state: DiscoveryFormState) {
  return resolveManualNumber({
    mode: state.tax.partsMode,
    autoValue: estimateTaxParts(state),
    manualValue: state.tax.partsManual,
  }).value
}

export function getTaxPartsOrigin(state: DiscoveryFormState): ValueOrigin {
  return resolveManualNumber({
    mode: state.tax.partsMode,
    autoValue: estimateTaxParts(state),
    manualValue: state.tax.partsManual,
  }).origin
}

export function getResolvedTaxableIncome(state: DiscoveryFormState) {
  return resolveManualNumber({
    mode: state.tax.taxableIncomeMode,
    autoValue: estimateTaxableIncomeAnnual(state),
    manualValue: state.tax.taxableIncomeManual,
  }).value
}

export function getTaxableIncomeOrigin(state: DiscoveryFormState): ValueOrigin {
  if (getSelectedHouseholdIncomeOrigin(state) === 'incomplete' && state.tax.taxableIncomeMode === 'auto') {
    return 'incomplete'
  }

  return resolveManualNumber({
    mode: state.tax.taxableIncomeMode,
    autoValue: estimateTaxableIncomeAnnual(state),
    manualValue: state.tax.taxableIncomeManual,
  }).origin
}

export function getResolvedTmi(state: DiscoveryFormState) {
  return resolveManualText({
    mode: state.tax.tmiMode,
    autoValue: estimateTmiLabel(state),
    manualValue: state.tax.tmiManual,
  }).value
}

export function getTmiOrigin(state: DiscoveryFormState): ValueOrigin {
  if (
    (getTaxableIncomeOrigin(state) === 'incomplete' || getTaxPartsOrigin(state) === 'incomplete') &&
    state.tax.tmiMode === 'auto'
  ) {
    return 'incomplete'
  }

  return resolveManualText({
    mode: state.tax.tmiMode,
    autoValue: estimateTmiLabel(state),
    manualValue: state.tax.tmiManual,
  }).origin
}

export function getRiskScore(state: DiscoveryFormState) {
  const values = [
    Number(state.objectives.horizonTolerance || 0),
    Number(state.objectives.marketKnowledge || 0),
    Number(state.objectives.investmentExperience || 0),
    Number(state.objectives.drawdownReaction || 0),
    Number(state.objectives.lossCapacity || 0),
    Number(state.objectives.performanceGoal || 0),
    Number(state.objectives.returnVolatilityTradeoff || 0),
    Number(state.objectives.capitalStabilityNeed || 0),
  ]

  return values.reduce((sum, value) => sum + value, 0)
}

function getRiskKnowledgeScore(state: DiscoveryFormState) {
  return Number(state.objectives.marketKnowledge || 0) + Number(state.objectives.investmentExperience || 0)
}

function getRiskBehaviorScore(state: DiscoveryFormState) {
  return (
    Number(state.objectives.drawdownReaction || 0) +
    Number(state.objectives.lossCapacity || 0) +
    Number(state.objectives.performanceGoal || 0) +
    Number(state.objectives.returnVolatilityTradeoff || 0) +
    Number(state.objectives.capitalStabilityNeed || 0)
  )
}

function getRiskCapacityScore(state: DiscoveryFormState) {
  return Number(state.objectives.horizonTolerance || 0)
}

export function getSuggestedRiskProfile(state: DiscoveryFormState): RiskLevel {
  const totalScore = getRiskScore(state)
  const knowledgeScore = getRiskKnowledgeScore(state)
  const behaviorScore = getRiskBehaviorScore(state)
  const capacityScore = getRiskCapacityScore(state)

  const veryPrudentGuard =
    Number(state.objectives.drawdownReaction || 0) === 1 ||
    Number(state.objectives.lossCapacity || 0) === 1 ||
    Number(state.objectives.returnVolatilityTradeoff || 0) === 1

  const noviceGuard =
    Number(state.objectives.marketKnowledge || 0) === 1 &&
    Number(state.objectives.investmentExperience || 0) === 1

  if (veryPrudentGuard && noviceGuard) return 'Prudent'
  if (behaviorScore <= 8) return 'Prudent'
  if (knowledgeScore <= 3 && behaviorScore <= 10) return 'Prudent'
  if (capacityScore <= 1 && behaviorScore <= 11) return 'Prudent'
  if (totalScore <= 14) return 'Prudent'

  if (totalScore >= 25 && knowledgeScore >= 6 && behaviorScore >= 14 && capacityScore >= 3) {
    return 'Dynamique'
  }

  return 'Équilibré'
}

export function getResolvedRiskProfile(state: DiscoveryFormState): RiskLevel {
  return state.objectives.riskProfileMode === 'manual'
    ? state.objectives.riskProfileManual
    : getSuggestedRiskProfile(state)
}

export function getRiskProfileExplanation(state: DiscoveryFormState) {
  const suggested = getSuggestedRiskProfile(state)

  if (suggested === 'Prudent') {
    return 'Le questionnaire fait ressortir une sensibilité marquée à la perte, un besoin de stabilité important ou une expérience encore limitée. Une approche prudente paraît la plus cohérente à ce stade.'
  }

  if (suggested === 'Équilibré') {
    return 'Le questionnaire fait apparaître une capacité d’acceptation du risque mesurée, compatible avec une allocation diversifiée mais encadrée. Une approche équilibrée semble adaptée.'
  }

  return 'Le questionnaire fait ressortir un horizon long, une meilleure tolérance aux fluctuations et une capacité d’acceptation du risque plus élevée. Une approche dynamique peut être envisagée.'
}

export function getHouseholdSummary(state: DiscoveryFormState) {
  const linkedCount = state.linkedPersons.length
  const dependants = state.linkedPersons.filter((person) => person.isDependent || person.isTaxAttached).length

  return {
    linkedCount,
    dependants,
    taxParts: getResolvedTaxParts(state),
    taxSituation: getResolvedTaxSituation(state),
  }
}

export function personLabel(person: LinkedPerson) {
  return `${person.firstName || 'Prénom'} ${person.lastName || 'Nom'}`.trim()
}

export function isOriginIncomplete(origin: ValueOrigin) {
  return origin === 'incomplete'
}

export function hasPositiveManualValue(value: unknown) {
  return hasPositiveNumber(value)
}

export { hasMeaningfulText }
