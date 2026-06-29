import { describe, it, expect } from 'vitest'
import {
  THEMES,
  THEME_CATEGORIES,
  ALL_THEME_IDS,
  getThemeById,
  getThemesByCategory,
  type ThemeId,
} from './themes'

const EXPECTED_IDS: ThemeId[] = [
  'light',
  'dark',
  'colorful',
  'rose-violet',
  'minimalist',
  'futuristic',
  'ocean',
  'sunset',
  'high-contrast',
  'high-contrast-dark',
]

const HEX = /^#[0-9A-Fa-f]{6}$/

describe('themes registry', () => {
  it('registra exatamente 10 temas (Cyberpunk removido)', () => {
    expect(THEMES).toHaveLength(10)
    expect(ALL_THEME_IDS).toEqual(EXPECTED_IDS)
  })

  it('não contém mais o tema cyberpunk', () => {
    expect(ALL_THEME_IDS).not.toContain('cyberpunk' as ThemeId)
  })

  it('distribui os temas nas 3 categorias (2 principais, 6 personalidade, 2 acessibilidade)', () => {
    expect(getThemesByCategory('main')).toHaveLength(2)
    expect(getThemesByCategory('personality')).toHaveLength(6)
    expect(getThemesByCategory('accessibility')).toHaveLength(2)
    expect(THEME_CATEGORIES.map((c) => c.id)).toEqual([
      'main',
      'personality',
      'accessibility',
    ])
  })

  it('cada tema tem metadados completos e preview no formato hex', () => {
    for (const theme of THEMES) {
      expect(theme.id).toBeTruthy()
      expect(theme.label).toBeTruthy()
      expect(theme.description).toBeTruthy()
      expect(theme.icon).toMatch(/^fa-/)
      expect(['main', 'personality', 'accessibility']).toContain(theme.category)
      expect(['light', 'dark']).toContain(theme.base)
      expect(theme.preview.background).toMatch(HEX)
      expect(theme.preview.primary).toMatch(HEX)
      expect(theme.preview.accent).toMatch(HEX)
      expect(theme.preview.foreground).toMatch(HEX)
    }
  })

  it('Oceano é um tema de base escura', () => {
    expect(getThemeById('ocean').base).toBe('dark')
  })

  it('getThemeById retorna o tema Claro como fallback para IDs desconhecidos', () => {
    // Cobre preferências antigas persistidas (ex.: "cyberpunk").
    expect(getThemeById('cyberpunk' as ThemeId).id).toBe('light')
  })
})
