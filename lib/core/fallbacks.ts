import { hasMeaningfulText, safeText } from './text'
import { hasPositiveNumber, toSafeNumber } from './number'

export function resolveManualNumber(params: {
  mode: 'auto' | 'manual'
  autoValue: unknown
  manualValue: unknown
  allowZero?: boolean
}): { value: number; origin: 'auto' | 'manual' | 'incomplete' } {
  const { mode, autoValue, manualValue, allowZero = false } = params
  const autoResolved = toSafeNumber(autoValue, 0)
  const manualResolved = toSafeNumber(manualValue, 0)
  const manualValid = allowZero ? manualValue !== '' && manualValue !== null && manualValue !== undefined : hasPositiveNumber(manualValue)

  if (mode === 'manual') {
    return {
      value: manualValid ? manualResolved : autoResolved,
      origin: manualValid ? 'manual' : 'incomplete',
    }
  }

  return {
    value: autoResolved,
    origin: autoResolved > 0 || allowZero ? 'auto' : 'incomplete',
  }
}

export function resolveManualText(params: {
  mode: 'auto' | 'manual'
  autoValue: unknown
  manualValue: unknown
}): { value: string; origin: 'auto' | 'manual' | 'incomplete' } {
  const { mode, autoValue, manualValue } = params
  const autoResolved = safeText(autoValue, '')
  const manualResolved = safeText(manualValue, '')

  if (mode === 'manual') {
    return {
      value: manualResolved || autoResolved,
      origin: hasMeaningfulText(manualValue) ? 'manual' : 'incomplete',
    }
  }

  return {
    value: autoResolved,
    origin: autoResolved ? 'auto' : 'incomplete',
  }
}
