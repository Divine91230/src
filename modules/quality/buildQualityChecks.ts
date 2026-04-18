import type { DiscoveryFormState } from '../../pages/discovery/discovery.types'
import {
  getEmergencyFundMonths,
  getResolvedRiskProfile,
  getResolvedTmi,
  getSelectedHouseholdIncome,
  getSelectedSavingsCapacity,
  getTotalAssets,
  getTotalLiabilitiesCapital,
  toSafeNumber,
} from '../../pages/discovery/discovery.helpers'
import { buildBudgetChecks } from './budgetChecks'
import type { QualityIssue } from './quality.types'

function parseTmiPercent(tmi: string): number {
  return toSafeNumber(String(tmi || '').replace('%', ''), 0)
}

export function buildQualityChecks(state: DiscoveryFormState | null | undefined): QualityIssue[] {
  if (!state) {
    return [
      {
        id: 'global-missing-discovery',
        severity: 'blocking',
        title: 'Découverte absente',
        message: 'Aucune découverte patrimoniale disponible pour ce dossier.',
        section: 'global',
      },
    ]
  }

  const issues: QualityIssue[] = [...buildBudgetChecks(state)]
  const emergencyMonths = getEmergencyFundMonths(state)
  const totalAssets = getTotalAssets(state.assets)
  const totalLiabilities = getTotalLiabilitiesCapital(state)
  const selectedIncome = getSelectedHouseholdIncome(state)
  const selectedSavings = getSelectedSavingsCapacity(state)
  const riskProfile = getResolvedRiskProfile(state)
  const tmi = parseTmiPercent(getResolvedTmi(state))
  const horizonYears = toSafeNumber(state.objectives.horizonYears, 0)
  const liquidityNeed = state.objectives.liquidityNeed
  const objective = state.objectives.mainObjective

  if (!state.mainPerson.firstName?.trim() || !state.mainPerson.lastName?.trim()) {
    issues.push({
      id: 'identity-missing',
      severity: 'blocking',
      title: 'Identité incomplète',
      message: 'Le prénom et le nom de la personne principale doivent être renseignés.',
      section: 'identity',
    })
  }

  if (horizonYears <= 0) {
    issues.push({
      id: 'objective-horizon-missing',
      severity: 'blocking',
      title: 'Horizon de placement manquant',
      message: 'L’horizon de placement doit être renseigné pour produire une recommandation cohérente.',
      section: 'objectives',
    })
  }

  if (objective === 'Préparer la retraite' && horizonYears > 0 && horizonYears < 5) {
    issues.push({
      id: 'objective-retirement-short-horizon',
      severity: 'warning',
      title: 'Objectif retraite avec horizon court',
      message: 'L’objectif retraite paraît ambitieux au regard d’un horizon inférieur à 5 ans.',
      section: 'objectives',
    })
  }

  if (liquidityNeed === 'Très élevé' && (state.investmentProject.hasInitialLumpSum || state.investmentProject.fundingMode === 'existing_only')) {
    issues.push({
      id: 'investment-liquidity-tension',
      severity: 'warning',
      title: 'Besoin de liquidité élevé',
      message: 'Le client exprime un besoin de liquidité élevé : vérifier la part réellement mobilisable sans dégrader la souplesse du dossier.',
      section: 'investment',
    })
  }

  if (emergencyMonths < 3) {
    issues.push({
      id: 'budget-emergency-low',
      severity: 'warning',
      title: 'Réserve de sécurité faible',
      message: 'La réserve de sécurité semble inférieure à 3 mois de charges.',
      section: 'budget',
    })
  }

  if (selectedIncome > 0 && selectedSavings <= 0) {
    issues.push({
      id: 'budget-no-savings',
      severity: 'info',
      title: 'Capacité d’épargne nulle',
      message: 'Aucune capacité d’épargne exploitable ne ressort du budget retenu.',
      section: 'budget',
    })
  }

  if (riskProfile === 'Prudent' && horizonYears >= 8 && tmi >= 30) {
    issues.push({
      id: 'risk-profile-prudent-check',
      severity: 'info',
      title: 'Profil prudent à confirmer',
      message: 'Le profil prudent peut être cohérent, mais mérite une validation au regard d’un horizon long et d’un foyer fiscal potentiellement optimisable.',
      section: 'objectives',
    })
  }

  if (totalAssets > 0 && totalLiabilities > totalAssets) {
    issues.push({
      id: 'patrimony-negative-networth',
      severity: 'warning',
      title: 'Patrimoine net négatif',
      message: 'Le passif semble supérieur au total des actifs renseignés.',
      section: 'assets',
    })
  }

  return issues
}
