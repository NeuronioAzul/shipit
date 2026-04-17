import { useTheme } from '../contexts/ThemeContext'
import { THEME_CATEGORIES, getThemesByCategory, type ThemeMetadata } from '../themes/themes'

function ThemeCard({ theme, isActive, onSelect }: { theme: ThemeMetadata; isActive: boolean; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className={`
        cyber-neon-border relative flex flex-col gap-2 p-3 rounded-lg border-2 text-left cursor-pointer transition-all
        ${isActive
          ? 'border-primary border border-3'
          : 'border-border bg-card hover:border-primary/40 hover:bg-surface-hover'
        }
      `}
      title={theme.description}
      aria-pressed={isActive}
      aria-label={`Tema ${theme.label}`}
    >
      {/* Swatches */}
      <div className="flex items-center gap-1.5">
        {[theme.preview.background, theme.preview.primary, theme.preview.accent, theme.preview.foreground].map(
          (color, i) => (
            <span
              key={i}
              className="w-5 h-5 rounded-full border border-black/10 shrink-0"
              style={{ backgroundColor: color }}
            />
          ),
        )}
      </div>

      {/* Label + icon */}
      <div className="flex items-center gap-2">
        <i className={`${theme.icon} text-xs text-muted-foreground`} aria-hidden="true" />
        <span className="text-sm font-medium">{theme.label}</span>
      </div>

      {/* Description */}
      <span className="text-xs text-muted-foreground leading-snug">{theme.description}</span>

      {/* Active indicator */}
      {isActive && (
        <span className="absolute top-2 right-2 text-primary text-xs">
          <i className="fa-solid fa-circle-check" aria-hidden="true" />
        </span>
      )}
    </button>
  )
}

export function ThemeSelector() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="space-y-5">
      {THEME_CATEGORIES.map((category) => {
        const themes = getThemesByCategory(category.id)
        return (
          <div key={category.id}>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">{category.label}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {themes.map((t) => (
                <ThemeCard
                  key={t.id}
                  theme={t}
                  isActive={theme === t.id}
                  onSelect={() => setTheme(t.id)}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
