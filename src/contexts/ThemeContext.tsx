import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { ALL_THEME_IDS, getThemeById, type ThemeId } from '../themes/themes'

interface ThemeContextType {
  theme: ThemeId
  isDark: boolean
  setTheme: (theme: ThemeId) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

function isValidThemeId(value: string): value is ThemeId {
  return (ALL_THEME_IDS as string[]).includes(value)
}

export function ThemeProvider({
  children,
  defaultTheme = 'dark',
}: {
  children: ReactNode
  defaultTheme?: ThemeId
}) {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    const stored = localStorage.getItem('shipit-theme')
    if (stored && isValidThemeId(stored)) return stored
    return defaultTheme
  })

  const transitionTimeout = useRef<ReturnType<typeof setTimeout>>(undefined)

  const isDark = getThemeById(theme).base === 'dark'

  function setTheme(next: ThemeId) {
    if (!isValidThemeId(next)) return
    setThemeState(next)
  }

  useEffect(() => {
    const root = window.document.documentElement

    // Add transition class for smooth theme switch
    root.classList.add('theme-transitioning')
    clearTimeout(transitionTimeout.current)
    transitionTimeout.current = setTimeout(() => {
      root.classList.remove('theme-transitioning')
    }, 300)

    // Remove all theme classes and apply the current one
    root.classList.remove(...ALL_THEME_IDS)
    root.classList.add(theme)
    localStorage.setItem('shipit-theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }

  return (
    <ThemeContext.Provider value={{ theme, isDark, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
