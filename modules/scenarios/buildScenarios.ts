import type { ClientSnapshot } from '../../domain/types/patrimony'
import type { ScenarioCard } from '../../domain/types/analysis'
import { buildSuitability } from '../suitability/buildSuitability'

function riskToLabel(value: ClientSnapshot['riskProfile']) {
  if (value === 'PRUDENT') return 'Prudent'
  if (value === 'DYNAMIQUE') return 'Dynamique'
  return 'Équilibré'
}

export function buildScenarios(input: ClientSnapshot): ScenarioCard[] {
  const baseEffort = Math.max(input.budget.monthlySavingsCapacity, 0)
  const debtRatioPct = input.budget.monthlyNetIncome > 0
    ? Math.round((input.budget.monthlyFixedExpenses / input.budget.monthlyNetIncome) * 100)
    : 0
  const emergencyMonths = input.assets.liquidities / Math.max(input.budget.monthlyFixedExpenses, 1)
  const objective = input.goals.join(' ')
  const riskProfile = riskToLabel(input.riskProfile)

  const raw: Array<Omit<ScenarioCard, 'suitability' | 'rationale'> & { key: 'secure' | 'balanced' | 'growth'; liquidityNeed: 'high' | 'medium' | 'low'; illiquidityTolerance: 'low' | 'medium' | 'high' }> = [
    {
      key: 'secure',
      code: 'S1_SECURISATION',
      title: 'Sécurisation',
      description: 'Accent sur réserve, stabilité, souplesse et réduction de vulnérabilité.',
      expectedNetReturn: 2.5,
      monthlyEffort: Math.round(baseEffort * 0.7),
      liquidityLevel: 'FORTE',
      liquidityNeed: 'high',
      illiquidityTolerance: 'low',
    },
    {
      key: 'balanced',
      code: 'S2_EQUILIBRE',
      title: 'Équilibre progressif',
      description: 'Montée en puissance graduelle avec poche de sécurité, diversification financière et cohérence fiscale.',
      expectedNetReturn: 4.8,
      monthlyEffort: baseEffort,
      liquidityLevel: 'MOYENNE',
      liquidityNeed: 'medium',
      illiquidityTolerance: 'medium',
    },
    {
      key: 'growth',
      code: 'S3_VALORISATION',
      title: 'Valorisation long terme',
      description: 'Approche davantage orientée capitalisation et horizon long, avec liquidité plus contrainte.',
      expectedNetReturn: 6.2,
      monthlyEffort: Math.round(baseEffort * 1.15),
      liquidityLevel: 'FAIBLE',
      liquidityNeed: 'low',
      illiquidityTolerance: 'high',
    },
  ]

  return raw.map((scenario) => {
    const suitability = buildSuitability({
      riskProfile,
      tmi: `${Math.round(input.marginalTaxRate * 100)} %`,
      emergencyMonths,
      debtRatio: debtRatioPct,
      realEstateWeight: 0,
      selectedSavings: baseEffort,
      baseInitialCapital: 0,
      baseMonthlyContribution: scenario.monthlyEffort,
      objective,
      liquidityNeed: scenario.liquidityNeed,
      flexibilityNeed: 'medium',
      illiquidityTolerance: scenario.illiquidityTolerance,
      investmentHorizonYears: input.age < 45 ? 12 : input.age < 60 ? 8 : 5,
    })

    return {
      ...scenario,
      suitability: suitability.status,
      rationale: [...suitability.strengths, ...suitability.reserves].slice(0, 4),
    }
  })
}
