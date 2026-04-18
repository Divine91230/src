export function safeText(value: unknown, fallback = '—'): string {
  const text = String(value ?? '').trim()
  return text || fallback
}

export function hasMeaningfulText(value: unknown): boolean {
  return typeof value === 'string' ? value.trim().length > 0 : false
}

export function normalizeText(value: unknown): string {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}
