import { useState, useEffect } from 'react'
import { SearchBar } from './SearchBar'
import { useNavigationHistory } from '../contexts/NavigationHistoryContext'

export function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false)
  const { canGoBack, canGoForward, goBack, goForward } = useNavigationHistory()

  useEffect(() => {
    // Get initial maximized state
    window.electronAPI?.windowIsMaximized().then(setIsMaximized)

    // Listen for maximize/unmaximize events
    const unsub = window.electronAPI?.onWindowMaximized(setIsMaximized)
    return () => unsub?.()
  }, [])

  const handleMinimize = () => window.electronAPI?.windowMinimize()
  const handleMaximize = () => window.electronAPI?.windowMaximize()
  const handleClose = () => window.electronAPI?.windowClose()
  const handleGoBack = () => goBack()
  const handleGoForward = () => goForward()

  return (
    <div 
      id="titlebar"
      className="h-13.25 bg-titlebar flex items-center justify-between select-none shrink-0"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* Left: Full Logo */}
      <div id="titlebar-logo" className="flex items-center pl-3">
        <img
          src="./assets/images/logo-composto-colorido.svg"
          alt="ShipIt!"
          className="h-7 bg-white/90 rounded px-1"
          onError={(e) => {
            // Fallback to PNG if SVG not found
            (e.target as HTMLImageElement).src = './assets/images/icons/favicon-32x32.png'
          }}
        />
      </div>

      {/* Center: Search Bar */}
      <div
        id="titlebar-search"
        className="flex-1 min-w-0 flex items-center justify-center gap-2 px-2"
      >
        <div
          id="titlebar-nav"
          className="flex items-center gap-1 shrink-0"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <button
            id="titlebar-btn-back"
            type="button"
            onClick={handleGoBack}
            disabled={!canGoBack}
            className="h-8 w-8 rounded-md flex items-center justify-center text-titlebar-foreground/70 hover:text-titlebar-foreground hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
            title="Voltar"
            aria-label="Voltar no histórico"
          >
            <i className="fa-solid fa-chevron-left text-xs" aria-hidden="true"></i>
          </button>
          <button
            id="titlebar-btn-forward"
            type="button"
            onClick={handleGoForward}
            disabled={!canGoForward}
            className="h-8 w-8 rounded-md flex items-center justify-center text-titlebar-foreground/70 hover:text-titlebar-foreground hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
            title="Avançar"
            aria-label="Avançar no histórico"
          >
            <i className="fa-solid fa-chevron-right text-xs" aria-hidden="true"></i>
          </button>
        </div>
        <SearchBar />
      </div>

      {/* Right: Window Controls */}
      <div 
        id="titlebar-controls"
        className="flex items-center h-full"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {/* Minimize */}
        <button
          id="titlebar-btn-minimize"
          onClick={handleMinimize}
          className="h-full w-12 flex items-center justify-center text-titlebar-foreground/70 hover:bg-white/10 transition-colors"
          title="Minimizar"
          aria-label="Minimizar janela"
        >
          <svg width="10" height="1" viewBox="0 0 10 1" fill="currentColor" aria-hidden="true">
            <rect width="10" height="1" />
          </svg>
        </button>

        {/* Maximize/Restore */}
        <button
          id="titlebar-btn-maximize"
          onClick={handleMaximize}
          className="h-full w-12 flex items-center justify-center text-titlebar-foreground/70 hover:bg-white/10 transition-colors"
          title={isMaximized ? 'Restaurar' : 'Maximizar'}
          aria-label={isMaximized ? 'Restaurar janela' : 'Maximizar janela'}
        >
          {isMaximized ? (
            // Restore icon (two overlapping squares)
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true">
              <path d="M2 3v5h5V3H2z" />
              <path d="M3 3V1h5v5H7" />
            </svg>
          ) : (
            // Maximize icon (single square)
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true">
              <rect x="0.5" y="0.5" width="9" height="9" />
            </svg>
          )}
        </button>

        {/* Close */}
        <button
          id="titlebar-btn-close"
          onClick={handleClose}
          className="h-full w-12 flex items-center justify-center text-titlebar-foreground/70 hover:bg-destructive hover:text-destructive-foreground transition-colors"
          title="Fechar"
          aria-label="Fechar janela"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" aria-hidden="true">
            <path d="M1.41 0L5 3.59 8.59 0 10 1.41 6.41 5 10 8.59 8.59 10 5 6.41 1.41 10 0 8.59 3.59 5 0 1.41z" />
          </svg>
        </button>
      </div>
    </div>
  )
}
