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
    description: 'Tema padrão com tons de azul e branco',
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
    description: 'Visual escuro com acentos vibrantes',
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
    description: 'Paleta vibrante e multicolorida focada nas cores primárias',
    icon: 'fa-solid fa-palette',
    category: 'personality',
    base: 'light',
    preview: {
      background: '#FFFBF7',
      primary: '#0E00D7',
      accent: '#BC0000',
      foreground: '#F59E0B',
    },
  },
  {
    id: 'rose-violet',
    label: 'Rosa & Violeta',
    description: 'Elegância em tons de rosa, violeta e roxo, com detalhes sutis',
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
    description: 'Tons de cinza com acento sutil',
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
    description: 'Neon ciano e roxo em fundo escuro',
    icon: 'fa-solid fa-rocket',
    category: 'personality',
    base: 'dark',
    preview: {
      background: '#030305',
      primary: '#00CFFF',
      accent: '#8B00FF',
      foreground: '#F6F8FF',
    },
  },
  {
    id: 'ocean',
    label: 'Oceano',
    description: 'Tons de azul e verde-água em fundo profundo',
    icon: 'fa-solid fa-water',
    category: 'personality',
    base: 'dark',
    preview: {
      background: '#071826',
      primary: '#2CA3C3',
      accent: '#1DB7AE',
      foreground: '#F5FBFD',
    },
  },
  {
    id: 'sunset',
    label: 'Pôr do Sol',
    description: 'Tons quentes de laranja e dourado',
    icon: 'fa-solid fa-sun-plant-wilt',
    category: 'personality',
    base: 'light',
    preview: {
      background: '#F5F2ED',
      primary: '#B13F0A',
      accent: '#E58A17',
      foreground: '#2F120B',
    },
  },
  // Accessibility
  {
    id: 'high-contrast',
    label: 'Alto Contraste',
    description: 'WCAG AAA — com fundo branco',
    icon: 'fa-solid fa-eye',
    category: 'accessibility',
    base: 'light',
    preview: {
      background: '#FFFFFF',
      primary: '#0000CC',
      accent: '#993300',
      foreground: '#000000',
    },
  },
  {
    id: 'high-contrast-dark',
    label: 'Alto Contraste Escuro',
    description: 'WCAG AAA — com fundo preto',
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
