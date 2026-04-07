import { Link } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'

export function Header() {
  const { theme, toggleTheme } = useTheme()

  return (
    <header className="bg-primary text-primary-foreground px-6 py-3 flex items-center justify-between shadow-md select-none"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      <Link
        to="/"
        className="flex items-center gap-2 no-underline text-primary-foreground hover:opacity-90 transition-opacity"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <img
          src="/images/logo-composto-colorido.svg"
          alt="ShipIt! Logo"
          className="h-8"
        />
      </Link>

      <div
        className="flex items-center gap-4"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <Link
          to="/profile"
          className="text-primary-foreground/80 hover:text-primary-foreground transition-colors"
          title="Configurações"
        >
          <i className="fa-solid fa-gear text-lg"></i>
        </Link>

        <button
          onClick={toggleTheme}
          className="text-primary-foreground/80 hover:text-primary-foreground transition-colors cursor-pointer"
          title={theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
        >
          <i className={`fa-solid ${theme === 'dark' ? 'fa-sun' : 'fa-moon'} text-lg`}></i>
        </button>
      </div>
    </header>
  )
}
