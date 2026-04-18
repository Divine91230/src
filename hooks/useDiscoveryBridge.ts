// ─── useDiscoveryBridge ───────────────────────────────────────────────────────
// Hook qui fait le pont automatique entre la découverte patrimoniale et
// les modules de calcul (analyse, scoring, scénarios, priorités).
//
// À utiliser dans AnalysisPage, ScenariosPage, RecommendationsPage, etc.
// pour ne plus jamais appeler useCurrentAnalysis() avec des données fictives.
//
// Usage :
//   const { snapshot, analysis, scoring, priorities, hasData } = useDiscoveryBridge()

import { useMemo } from 'react'
import { useCabinetStore } from '../store/useCabinetStore'
import {
  calculateAge,
  getEmergencyFundMonths,
  getIncludedChargesTotal,
  getLiquidAssetsTotal,
  getResolvedRiskProfile,
  getResolvedTmi,
  getSelectedHouseholdIncome,
  getSelectedSavingsCapacity,
  getTotalAssets,
  getTotalLiabilitiesCapital,
  toSafeNumber,
} from '../pages/discovery/discovery.helpers'
import { buildAnalysis } from '../modules/analysis/buildAnalysis'
import { buildClientScoring } from '../modules/scoring/buildClientScoring'
import { buildPriorityPlan } from '../modules/priorities/buildPriorityPlan'
import { buildRecommendations } from '../modules/recommendations/buildRecommendations'
import { buildScenarios } from '../modules/scenarios/buildScenarios'
import { buildQualityChecks } from '../modules/quality/buildQualityChecks'
import type { ClientSnapshot, RiskProfile } from '../domain/types/patrimony'

// ─── Conversion interne Discovery → ClientSnapshot ────────────────────────────
function toSnapshot(data: any): ClientSnapshot | null {
  if (!data) return null

  try {
    const monthlyIncome = getSelectedHouseholdIncome(data)
    const monthlyCharges = getIncludedChargesTotal(data?.charges ?? [])
    const monthlySavings = getSelectedSavingsCapacity(data)
    const liquidities = getLiquidAssetsTotal(data?.assets ?? [])

    const realEstate = (data?.assets ?? [])
      .filter((a: any) => a.category === 'Immobilier')
      .reduce((sum: number, a: any) => sum + toSafeNumber(a.amount, 0), 0)

    const financial = (data?.assets ?? [])
      .filter((a: any) => a.category === 'Financier')
      .reduce((sum: number, a: any) => sum + toSafeNumber(a.amount, 0), 0)

    const professional = (data?.assets ?? [])
      .filter((a: any) => a.category === 'Professionnel')
      .reduce((sum: number, a: any) => sum + toSafeNumber(a.amount, 0), 0)

    const other = (data?.assets ?? [])
      .filter((a: any) => !['Immobilier', 'Financier', 'Professionnel', 'Liquidités'].includes(a.category))
      .reduce((sum: number, a: any) => sum + toSafeNumber(a.amount, 0), 0)

    const totalLiabilities = getTotalLiabilitiesCapital(data)

    const mortgage = (data?.liabilities ?? [])
      .filter((l: any) =>
        l.type === 'Crédit immobilier locatif' || l.type === 'Loyer / mensualité RP',
      )
      .reduce((sum: number, l: any) => sum + toSafeNumber(l.outstandingCapital, 0), 0)

    const consumerDebt = (data?.liabilities ?? [])
      .filter((l: any) => l.type === 'Crédit consommation')
      .reduce((sum: number, l: any) => sum + toSafeNumber(l.outstandingCapital, 0), 0)

    const otherDebt = Math.max(0, totalLiabilities - mortgage - consumerDebt)

    const tmiRaw = getResolvedTmi(data)
    const marginalTaxRate =
      toSafeNumber(String(tmiRaw ?? '').replace('%', '').trim(), 0) / 100

    const riskLevelLabel = getResolvedRiskProfile(data)
    const riskProfile: RiskProfile =
      riskLevelLabel === 'Dynamique'
        ? 'DYNAMIQUE'
        : riskLevelLabel === 'Prudent'
        ? 'PRUDENT'
        : 'EQUILIBRE'

    const mainObjective: string = data?.objectives?.mainObjective ?? ''
    const goals: ClientSnapshot['goals'] = []
    if (/retraite/i.test(mainObjective)) goals.push('RETRAITE')
    if (/transmission/i.test(mainObjective)) goals.push('TRANSMISSION')
    if (/protection/i.test(mainObjective)) goals.push('PROTECTION')
    if (/diversif/i.test(mainObjective)) goals.push('DIVERSIFICATION')
    if (/trésorerie|liquidité/i.test(mainObjective)) goals.push('TRESORERIE')
    if (goals.length === 0) goals.push('DIVERSIFICATION')

    const maritalStatus = data?.mainPerson?.householdStatus ?? ''
    const maritalStatusMapped: ClientSnapshot['household']['maritalStatus'] =
      maritalStatus === 'Marié(e)'
        ? 'MARIE'
        : maritalStatus === 'Pacsé(e)'
        ? 'PACSE'
        : maritalStatus === 'Divorcé(e)'
        ? 'DIVORCE'
        : maritalStatus === 'Veuf / Veuve'
        ? 'VEUF'
        : 'CELIBATAIRE'

    const childrenCount = (data?.linkedPersons ?? []).filter(
      (p: any) => p.role === 'Enfant',
    ).length

    const taxParts =
      toSafeNumber(data?.tax?.taxPartsManual, 0) ||
      (maritalStatusMapped === 'MARIE' || maritalStatusMapped === 'PACSE' ? 2 : 1) +
        childrenCount * 0.5

    const age = calculateAge(data?.mainPerson?.birthDate ?? '') ?? 40

    return {
      fullName:
        `${data?.mainPerson?.firstName ?? ''} ${data?.mainPerson?.lastName ?? ''}`.trim() ||
        'Client',
      age,
      household: { maritalStatus: maritalStatusMapped, taxParts, childrenCount },
      budget: {
        monthlyNetIncome: monthlyIncome,
        monthlyFixedExpenses: monthlyCharges,
        monthlySavingsCapacity: monthlySavings,
      },
      assets: { realEstate, financial, liquidities, professional, other },
      liabilities: { mortgage, consumerDebt, otherDebt },
      marginalTaxRate,
      goals,
      riskProfile,
      // ─── Protection — données réelles depuis la section Protection ───────
      protection: data?.protection ? {
        hasDeathCoverage: Boolean(data.protection.deathCoverage),
        hasDisabilityCoverage: Boolean(data.protection.disabilityCoverage),
        hasBorrowerInsurance: Boolean(data.protection.borrowerInsurance),
        spouseProtected: Boolean(data.protection.spouseProtected),
        dependantsProtected: Boolean(data.protection.dependantsProtected),
      } : undefined,
    }
  } catch {
    return null
  }
}

// ─── Hook principal ───────────────────────────────────────────────────────────
export function useDiscoveryBridge() {
  const selectedClient = useCabinetStore((s) => s.selectedClient)
  const discoveryByClientId = useCabinetStore((s) => s.discoveryByClientId)

  const discovery = selectedClient
    ? discoveryByClientId[selectedClient.id] ?? null
    : null

  const snapshot = useMemo(() => toSnapshot(discovery), [discovery])

  const qualityIssues = useMemo(
    () => buildQualityChecks(discovery),
    [discovery],
  )

  const scoring = useMemo(
    () => (snapshot ? buildClientScoring(snapshot) : null),
    [snapshot],
  )

  const priorities = useMemo(
    () => (snapshot && scoring ? buildPriorityPlan(snapshot, scoring) : []),
    [snapshot, scoring],
  )

  const analysis = useMemo(
    () => (snapshot ? buildAnalysis(snapshot) : null),
    [snapshot],
  )

  const recommendations = useMemo(() => {
    if (!snapshot) return []
    const grossAssets =
      snapshot.assets.realEstate +
      snapshot.assets.financial +
      snapshot.assets.liquidities +
      snapshot.assets.professional +
      snapshot.assets.other
    const emergencyFundMonths = getEmergencyFundMonths(discovery)
    const concentrationRealEstate =
      grossAssets > 0 ? snapshot.assets.realEstate / grossAssets : 0
    return buildRecommendations(snapshot, { emergencyFundMonths, concentrationRealEstate })
  }, [snapshot, discovery])

  const scenarios = useMemo(
    () => (snapshot ? buildScenarios(snapshot) : []),
    [snapshot],
  )

  // KPIs synthétiques
  const kpis = useMemo(() => {
    if (!snapshot) return null

    const grossAssets =
      snapshot.assets.realEstate +
      snapshot.assets.financial +
      snapshot.assets.liquidities +
      snapshot.assets.professional +
      snapshot.assets.other

    const totalDebt =
      snapshot.liabilities.mortgage +
      snapshot.liabilities.consumerDebt +
      snapshot.liabilities.otherDebt

    const netWorth = grossAssets - totalDebt
    const emergencyFundMonths = getEmergencyFundMonths(discovery)
    const debtRatio =
      snapshot.budget.monthlyNetIncome > 0
        ? snapshot.budget.monthlyFixedExpenses / snapshot.budget.monthlyNetIncome
        : 0

    return {
      netWorth: Math.round(netWorth),
      grossAssets: Math.round(grossAssets),
      totalDebt: Math.round(totalDebt),
      emergencyFundMonths: Number(emergencyFundMonths.toFixed(1)),
      debtRatio: Number(debtRatio.toFixed(3)),
      monthlySavings: Math.round(snapshot.budget.monthlySavingsCapacity),
      globalScore: scoring?.globalScore ?? null,
    }
  }, [snapshot, scoring, discovery])

  return {
    // Données brutes
    discovery,
    snapshot,
    // Indicateurs synthétiques
    kpis,
    // Résultats des modules de calcul
    analysis,
    scoring,
    priorities,
    recommendations,
    scenarios,
    qualityIssues,
    // État
    hasData: snapshot !== null,
    hasClient: selectedClient !== null,
    selectedClient,
  }
}
