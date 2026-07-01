import { describe, expect, it } from 'vitest'
import {
  ENVIRONMENTS,
  ENVIRONMENT_ABBR,
  ENVIRONMENT_COLORS,
  ENVIRONMENT_ICONS,
  ENVIRONMENT_SELECTED_COLORS,
} from './environmentColors'

describe('environmentColors', () => {
  it('lists the three environments in the expected order', () => {
    expect(ENVIRONMENTS).toEqual(['Desenvolvimento', 'Homologação', 'Produção'])
  })

  it('maps every environment to color/selected/icon/abbr tokens', () => {
    for (const env of ENVIRONMENTS) {
      expect(ENVIRONMENT_COLORS[env]).toBeTruthy()
      expect(ENVIRONMENT_SELECTED_COLORS[env]).toBeTruthy()
      expect(ENVIRONMENT_ICONS[env]).toMatch(/^fa-/)
      expect(ENVIRONMENT_ABBR[env]).toHaveLength(3)
    }
  })

  it('uses the expected three-letter abbreviations', () => {
    expect(ENVIRONMENT_ABBR).toEqual({
      'Desenvolvimento': 'dsv',
      'Homologação': 'hmg',
      'Produção': 'prd',
    })
  })

  it('uses the semantic chart tokens (green/yellow/red) without raw colors', () => {
    expect(ENVIRONMENT_COLORS['Desenvolvimento']).toContain('chart-2')
    expect(ENVIRONMENT_COLORS['Homologação']).toContain('chart-4')
    expect(ENVIRONMENT_COLORS['Produção']).toContain('chart-5')
  })
})
