import { useState, useEffect } from 'react'

export function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false)

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

  return (
    <div 
      className="h-8 bg-titlebar flex items-center justify-between select-none shrink-0"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* Left: App Icon and Title */}
      <div className="flex items-center gap-2 pl-3">
        <img
          src="/images/icon-foguete-logo-colorido.svg"
          alt="ShipIt!"
          className="h-4 w-4"
          onError={(e) => {
            // Fallback to PNG if SVG not found
            (e.target as HTMLImageElement).src = '/images/icons/favicon-32x32.png'
          }}
        />
        <span className="text-titlebar-foreground text-xs font-medium">ShipIt!</span>
      </div>

      {/* Right: Window Controls */}
      <div 
        className="flex items-center h-full"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {/* Minimize */}
        <button
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
          onClick={handleClose}
          className="h-full w-12 flex items-center justify-center text-titlebar-foreground/70 hover:bg-[#e81123] hover:text-white transition-colors"
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
