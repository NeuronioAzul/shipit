export type ThemeId =
  | 'light'
  | 'dark'
  | 'colorful'
  | 'rose-violet'
  | 'minimalist'
  | 'futuristic'
  | 'ocean'
  | 'sunset'
  | 'high-contrast'
  | 'high-contrast-dark'

export type ThemeBase = 'dark' | 'light'

export type ThemeCategory = 'main' | 'personality' | 'accessibility'

export interface ThemePreview {
  background: string
  primary: string
  accent: string
  foreground: string
}

export interface ThemeMetadata {
  id: ThemeId
  label: string
  description: string
  icon: string
  category: ThemeCategory
  base: ThemeBase
  preview: ThemePreview
}

export const THEMES: ThemeMetadata[] = [
  // Main
  {
    id: 'light',
    label: 'Claro',
    description: 'Azuis suaves e brancos quentes',
    icon: 'fa-solid fa-sun',
    category: 'main',
    base: 'light',
    preview: {
      background: '#F7F9FC',
      primary: '#0C356D',
      accent: '#E86E21',
      foreground: '#10233F',
    },
  },
  {
    id: 'dark',
    label: 'Escuro',
    description: 'Pretos profundos com acentos vibrantes',
    icon: 'fa-solid fa-moon',
    category: 'main',
    base: 'dark',
    preview: {
      background: '#081427',
      primary: '#E86E21',
      accent: '#92A4BD',
      foreground: '#EAF1FB',
    },
  },
  // Personality
  {
    id: 'colorful',
    label: 'Colorido',
    description: 'Paleta vibrante e lúdica',
    icon: 'fa-solid fa-palette',
    category: 'personality',
    base: 'light',
    preview: {
      background: '#FFFBF7',
      primary: '#7C3AED',
      accent: '#F43F5E',
      foreground: '#1E1B4B',
    },
  },
  {
    id: 'rose-violet',
    label: 'Rose & Violet',
    description: 'Tons rosa e roxo elegantes',
    icon: 'fa-solid fa-heart',
    category: 'personality',
    base: 'light',
    preview: {
      background: '#FDF2F8',
      primary: '#7C3AED',
      accent: '#EC4899',
      foreground: '#2E1065',
    },
  },
  {
    id: 'minimalist',
    label: 'Minimalista',
    description: 'Escala de cinza com acento sutil',
    icon: 'fa-solid fa-minimize',
    category: 'personality',
    base: 'light',
    preview: {
      background: '#FAFAFA',
      primary: '#18181B',
      accent: '#71717A',
      foreground: '#09090B',
    },
  },
  {
    id: 'futuristic',
    label: 'Futurista',
    description: 'Neon ciano e roxo, visual sci-fi',
    icon: 'fa-solid fa-rocket',
    category: 'personality',
    base: 'dark',
    preview: {
      background: '#0A0E1A',
      primary: '#06B6D4',
      accent: '#A855F7',
      foreground: '#E0F2FE',
    },
  },
  {
    id: 'ocean',
    label: 'Oceano',
    description: 'Azuis e teais, vibe marítima',
    icon: 'fa-solid fa-water',
    category: 'personality',
    base: 'light',
    preview: {
      background: '#F0F9FF',
      primary: '#0369A1',
      accent: '#0D9488',
      foreground: '#0C4A6E',
    },
  },
  {
    id: 'sunset',
    label: 'Pôr do Sol',
    description: 'Laranjas quentes e hora dourada',
    icon: 'fa-solid fa-sun-plant-wilt',
    category: 'personality',
    base: 'light',
    preview: {
      background: '#FFFBF0',
      primary: '#C2410C',
      accent: '#D97706',
      foreground: '#431407',
    },
  },
  // Accessibility
  {
    id: 'high-contrast',
    label: 'Alto Contraste',
    description: 'Contraste máximo WCAG AAA',
    icon: 'fa-solid fa-eye',
    category: 'accessibility',
    base: 'light',
    preview: {
      background: '#FFFFFF',
      primary: '#000000',
      accent: '#0000CC',
      foreground: '#000000',
    },
  },
  {
    id: 'high-contrast-dark',
    label: 'Alto Contraste Escuro',
    description: 'Fundo preto, texto branco/amarelo, AAA',
    icon: 'fa-solid fa-eye-low-vision',
    category: 'accessibility',
    base: 'dark',
    preview: {
      background: '#000000',
      primary: '#FFFF00',
      accent: '#00FFFF',
      foreground: '#FFFFFF',
    },
  },
]

export const THEME_CATEGORIES: { id: ThemeCategory; label: string }[] = [
  { id: 'main', label: 'Temas Principais' },
  { id: 'personality', label: 'Personalidade' },
  { id: 'accessibility', label: 'Acessibilidade' },
]

export function getThemeById(id: ThemeId): ThemeMetadata {
  return THEMES.find((t) => t.id === id) ?? THEMES[0]
}

export function getThemesByCategory(category: ThemeCategory): ThemeMetadata[] {
  return THEMES.filter((t) => t.category === category)
}

export const ALL_THEME_IDS: ThemeId[] = THEMES.map((t) => t.id)
