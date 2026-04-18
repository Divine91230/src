export function toSafeNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value

  if (typeof value === 'string') {
    const normalized = value
      .replace(/\u00a0/g, ' ')
      .replace(/\s/g, '')
      .replace('%', '')
      .replace(',', '.')
      .trim()

    if (!normalized) return fallback

    const parsed = Number(normalized)
    return Number.isFinite(parsed) ? parsed : fallback
  }

  return fallback
}

export function toNullableNumber(value: unknown): number | null {
  const parsed = toSafeNumber(value, Number.NaN)
  return Number.isFinite(parsed) ? parsed : null
}

export function toPositiveOrZero(value: unknown): number {
  return Math.max(0, toSafeNumber(value, 0))
}

export function hasPositiveNumber(value: unknown): boolean {
  return toSafeNumber(value, 0) > 0
}

export function sumSafe(values: unknown[]): number {
  return values.reduce<number>((sum, value) => sum + toSafeNumber(value, 0), 0)
}
