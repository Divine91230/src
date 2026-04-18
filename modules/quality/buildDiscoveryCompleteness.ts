import type { DiscoveryFormState } from '../../pages/discovery/discovery.types'
import {
  getIncludedChargesTotal,
  getIncludedRevenueTotal,
  getResolvedTaxParts,
  getResolvedTmi,
  getRiskScore,
  toSafeNumber,
} from '../../pages/discovery/discovery.helpers'
import type { DiscoveryCompleteness } from './quality.types'

export function buildDiscoveryCompleteness(data: DiscoveryFormState | null | undefined): DiscoveryCompleteness {
  const state = data as DiscoveryFormState | undefined

  const sections = [
    {
      key: 'identity',
      label: 'Identité',
      isComplete: Boolean(state?.mainPerson?.firstName?.trim()) && Boolean(state?.mainPerson?.lastName?.trim()),
    },
    {
      key: 'budget',
      label: 'Budget',
      isComplete: getIncludedRevenueTotal(state?.revenues ?? []) > 0 && getIncludedChargesTotal(state?.charges ?? []) > 0,
    },
    {
      key: 'assets',
      label: 'Patrimoine',
      isComplete: (state?.assets ?? []).length > 0,
    },
    {
      key: 'tax',
      label: 'Fiscalité',
      isComplete:
        Boolean(state?.tax?.taxResidenceCountry?.trim()) &&
        getResolvedTaxParts(state as DiscoveryFormState) > 0 &&
        Boolean(String(getResolvedTmi(state as DiscoveryFormState) || '').trim()),
    },
    {
      key: 'objectives',
      label: 'Objectifs / risque',
      isComplete:
        Boolean(state?.objectives?.mainObjective) &&
        toSafeNumber(state?.objectives?.horizonYears, 0) > 0 &&
        getRiskScore(state as DiscoveryFormState) > 0,
    },
    {
      key: 'investment',
      label: 'Projet',
      isComplete:
        Boolean(state?.investmentProject) &&
        (Boolean(state?.investmentProject?.hasMonthlyContribution) || Boolean(state?.investmentProject?.hasInitialLumpSum)),
    },
  ]

  const score = sections.filter((section) => section.isComplete).length
  const isComplete = sections.every((section) => section.isComplete)

  let nextAction = 'Poursuivre l’analyse patrimoniale'
  if (!sections[0].isComplete) nextAction = 'Compléter l’identité du foyer'
  else if (!sections[1].isComplete) nextAction = 'Compléter le budget du foyer'
  else if (!sections[3].isComplete) nextAction = 'Compléter la fiscalité retenue'
  else if (!sections[4].isComplete) nextAction = 'Préciser les objectifs et le profil investisseur'
  else if (!sections[5].isComplete) nextAction = 'Structurer le projet d’investissement'

  return {
    score,
    isComplete,
    sections,
    nextAction,
  }
}
