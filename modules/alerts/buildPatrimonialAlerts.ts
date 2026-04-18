import type { ClientSnapshot } from '../../domain/types/patrimony'

export type PatrimonialAlert = {
  level: 'warning' | 'danger'
  code: string
  label: string
  message: string
}

export function buildPatrimonialAlerts(input: ClientSnapshot): PatrimonialAlert[] {
  const alerts: PatrimonialAlert[] = []
  const monthlyExpenses = Math.max(input.budget.monthlyFixedExpenses, 1)
  const reserveMonths = input.assets.liquidities / monthlyExpenses
  const totalAssets = Object.values(input.assets).reduce((sum, value) => sum + value, 0)
  const realEstateWeight = totalAssets > 0 ? input.assets.realEstate / totalAssets : 0

  if (reserveMonths < 3) {
    alerts.push({
      level: 'danger',
      code: 'LOW_RESERVE',
      label: 'Réserve insuffisante',
      message: 'Le niveau de liquidités disponibles paraît insuffisant au regard des charges fixes du foyer.',
    })
  }

  if (realEstateWeight > 0.65) {
    alerts.push({
      level: 'warning',
      code: 'REAL_ESTATE_CONCENTRATION',
      label: 'Concentration immobilière élevée',
      message: 'Le patrimoine apparaît fortement concentré sur l’immobilier, ce qui limite la diversification et la souplesse.',
    })
  }

  if (input.budget.monthlySavingsCapacity <= 0) {
    alerts.push({
      level: 'danger',
      code: 'LOW_SAVINGS_CAPACITY',
      label: 'Capacité d’épargne insuffisante',
      message: 'La capacité d’épargne disponible ne permet pas encore d’envisager sereinement une montée en risque ou une stratégie plus ambitieuse.',
    })
  }

  return alerts
}
