import type { ClientSnapshot } from '../../domain/types/patrimony'
import type { AnalysisIndicator, AnalysisResult, Recommendation } from '../../domain/types/analysis'
import { buildRecommendations } from '../recommendations/buildRecommendations'
import { buildScenarios } from '../scenarios/buildScenarios'
import { buildClientScoring } from '../scoring/buildClientScoring'
import { buildPriorityPlan } from '../priorities/buildPriorityPlan'

export function buildAnalysis(input: ClientSnapshot): AnalysisResult {
  const monthlyBuffer = Math.max(input.budget.monthlyFixedExpenses, 1)
  const emergencyFundMonths = input.assets.liquidities / monthlyBuffer
  const totalDebt = input.liabilities.mortgage + input.liabilities.consumerDebt + input.liabilities.otherDebt
  const debtRatio = input.budget.monthlyNetIncome > 0
    ? input.budget.monthlyFixedExpenses / input.budget.monthlyNetIncome
    : 0
  const grossAssets = Object.values(input.assets).reduce((sum, value) => sum + value, 0)
  const netWorth = grossAssets - totalDebt
  const concentrationRealEstate = grossAssets > 0 ? input.assets.realEstate / grossAssets : 0
  const liquidityWeight = grossAssets > 0 ? input.assets.liquidities / grossAssets : 0

  const scoring = buildClientScoring(input)
  const priorities = buildPriorityPlan(input, scoring)

  const indicators: AnalysisIndicator[] = [
    { code: 'NET_WORTH', label: 'Patrimoine net', value: Math.round(netWorth), tone: 'neutral' },
    { code: 'EMERGENCY_FUND', label: 'Réserve (mois)', value: Number(emergencyFundMonths.toFixed(1)), tone: emergencyFundMonths >= 6 ? 'good' : emergencyFundMonths >= 3 ? 'warning' : 'danger' },
    { code: 'DEBT_RATIO', label: 'Charges / revenus', value: `${Math.round(debtRatio * 100)} %`, tone: debtRatio < 0.35 ? 'good' : debtRatio < 0.45 ? 'warning' : 'danger' },
    { code: 'REAL_ESTATE_WEIGHT', label: 'Poids immobilier', value: `${Math.round(concentrationRealEstate * 100)} %`, tone: concentrationRealEstate > 0.65 ? 'warning' : 'neutral' },
    { code: 'LIQUIDITY_WEIGHT', label: 'Poids liquidités', value: `${Math.round(liquidityWeight * 100)} %`, tone: liquidityWeight >= 0.1 ? 'good' : 'warning' },
    { code: 'GLOBAL_SCORE', label: 'Score global dossier', value: scoring.globalScore, tone: scoring.globalScore >= 70 ? 'good' : scoring.globalScore >= 45 ? 'warning' : 'danger' },
  ]

  const alerts: string[] = []
  if (emergencyFundMonths < 3) alerts.push('Réserve de sécurité insuffisante au regard des charges fixes.')
  if (debtRatio >= 0.4) alerts.push('Le poids des charges appelle une vigilance renforcée sur l’effort de mise en place.')
  if (concentrationRealEstate >= 0.65) alerts.push('Le patrimoine apparaît très concentré sur l’immobilier.')

  const recommendationMap = new Map<string, Recommendation>()
  for (const item of buildRecommendations(input, { emergencyFundMonths, concentrationRealEstate })) {
    recommendationMap.set(item.title, item)
  }

  for (const item of priorities.slice(0, 4)) {
    const axis = item.step === 'SECURISER'
      ? 'LIQUIDITE'
      : item.step === 'PROTEGER'
        ? 'PROTECTION'
        : item.step === 'DIVERSIFIER'
          ? 'DIVERSIFICATION'
          : item.step === 'OPTIMISER'
            ? 'FISCALITE'
            : item.step === 'PREPARER'
              ? 'RETRAITE'
              : 'TRANSMISSION'

    recommendationMap.set(item.title, {
      axis,
      title: item.title,
      summary: item.summary,
      urgency: item.score >= 70 ? 'ELEVEE' : item.score >= 45 ? 'MOYENNE' : 'FAIBLE',
      rationale: [
        `Priorité calculée : ${item.score}/100.`,
        'Lecture issue du scoring patrimonial et de la priorisation des besoins.',
      ],
    })
  }

  return {
    emergencyFundMonths,
    debtRatio,
    netWorth,
    concentrationRealEstate,
    indicators,
    priorities: Array.from(recommendationMap.values()).slice(0, 6),
    scenarios: buildScenarios(input),
    globalScore: scoring.globalScore,
    alerts,
  }
}
