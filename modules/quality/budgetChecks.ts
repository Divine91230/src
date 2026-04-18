import type { DiscoveryFormState } from '../../pages/discovery/discovery.types'
import {
  getIncludedChargesTotal,
  getIncludedRevenueTotal,
  getRemainingToLive,
  getSelectedCharges,
  getSelectedHouseholdIncome,
  getSelectedSavingsCapacity,
} from '../../pages/discovery/discovery.helpers'
import type { QualityIssue } from './quality.types'

export function buildBudgetChecks(state: DiscoveryFormState): QualityIssue[] {
  const issues: QualityIssue[] = []
  const autoIncome = getIncludedRevenueTotal(state.revenues)
  const autoCharges = getIncludedChargesTotal(state.charges)
  const selectedIncome = getSelectedHouseholdIncome(state)
  const selectedCharges = getSelectedCharges(state)
  const remaining = getRemainingToLive(state)
  const selectedSavings = getSelectedSavingsCapacity(state)

  if (autoIncome <= 0) {
    issues.push({
      id: 'budget-income-missing',
      severity: 'blocking',
      title: 'Revenus retenus manquants',
      message: 'Aucun revenu positif retenu dans le budget du foyer.',
      section: 'budget',
    })
  }

  if (autoCharges <= 0) {
    issues.push({
      id: 'budget-charges-missing',
      severity: 'blocking',
      title: 'Charges retenues manquantes',
      message: 'Aucune charge positive retenue dans le budget du foyer.',
      section: 'budget',
    })
  }

  if (selectedIncome > 0 && selectedCharges > selectedIncome) {
    issues.push({
      id: 'budget-negative-remaining',
      severity: 'warning',
      title: 'Reste à vivre négatif',
      message: 'Les charges retenues dépassent les revenus retenus.',
      section: 'budget',
    })
  }

  if (remaining > 0 && selectedSavings > remaining) {
    issues.push({
      id: 'budget-savings-too-high',
      severity: 'warning',
      title: 'Capacité d’épargne trop élevée',
      message: 'La capacité d’épargne retenue dépasse le reste à vivre estimé.',
      section: 'budget',
    })
  }

  if (selectedIncome > 0 && selectedCharges / selectedIncome < 0.15) {
    issues.push({
      id: 'budget-charges-too-low',
      severity: 'info',
      title: 'Charges très faibles',
      message: 'Les charges retenues semblent très faibles au regard des revenus du foyer.',
      section: 'budget',
    })
  }

  return issues
}
