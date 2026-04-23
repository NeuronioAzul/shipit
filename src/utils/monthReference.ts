function getFallbackMonthDate(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1)
}

function parseMonthReference(monthReference: string): Date {
  const [monthText, yearText] = monthReference.split('/')
  const month = Number.parseInt(monthText ?? '', 10)
  const year = Number.parseInt(yearText ?? '', 10)

  if (!Number.isFinite(month) || !Number.isFinite(year) || month < 1 || month > 12) {
    return getFallbackMonthDate()
  }

  return new Date(year, month - 1, 1)
}

export function toMonthReference(date: Date): string {
  return `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`
}

export function shiftMonthReference(monthReference: string, delta: number): string {
  const base = parseMonthReference(monthReference)
  const shifted = new Date(base.getFullYear(), base.getMonth() + delta, 1)
  return toMonthReference(shifted)
}

export function formatMonthReferenceLabel(monthReference: string, locale = 'pt-BR'): string {
  const date = parseMonthReference(monthReference)
  return date.toLocaleDateString(locale, { month: 'long', year: 'numeric' })
}
