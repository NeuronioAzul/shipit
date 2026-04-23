import { describe, expect, it } from 'vitest'
import { formatMonthReferenceLabel, shiftMonthReference, toMonthReference } from './monthReference'

describe('monthReference', () => {
  it('formats Date to MM/YYYY', () => {
    const result = toMonthReference(new Date(2026, 2, 15))
    expect(result).toBe('03/2026')
  })

  it('shifts month within same year', () => {
    expect(shiftMonthReference('03/2026', 2)).toBe('05/2026')
  })

  it('shifts month across year boundaries', () => {
    expect(shiftMonthReference('01/2026', -1)).toBe('12/2025')
    expect(shiftMonthReference('12/2026', 1)).toBe('01/2027')
  })

  it('falls back to current month on invalid input', () => {
    const now = new Date()
    const expected = `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`

    expect(shiftMonthReference('invalid', 0)).toBe(expected)
  })

  it('formats month label in pt-BR', () => {
    const label = formatMonthReferenceLabel('03/2026')
    expect(label).toContain('2026')
  })
})
