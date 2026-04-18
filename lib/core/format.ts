import { toSafeNumber } from './number'

export function formatCurrency(value: unknown): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(toSafeNumber(value, 0))
}

export function formatPercent(value: unknown, suffix = ' %'): string {
  return `${toSafeNumber(value, 0)}${suffix}`
}
