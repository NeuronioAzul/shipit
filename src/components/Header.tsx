import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'

function AboutModal({ onClose }: { onClose: () => void }) {
  const [version, setVersion] = useState('')

  useEffect(() => {
    window.electronAPI?.getVersion().then(setVersion)
  }, [])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div id="header-about-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="about-modal-title-header">
      <div
        className="bg-card border border-border rounded-lg p-6 shadow-xl max-w-sm w-full mx-4 animate-modal-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 id="about-modal-title-header" className="text-lg font-semibold flex items-center gap-2">
            <i className="fa-solid fa-circle-info text-primary" aria-hidden="true"></i>
            Sobre o ShipIt!
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer rounded focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none" aria-label="Fechar">
            <i className="fa-solid fa-xmark text-lg" aria-hidden="true"></i>
          </button>
        </div>
        <div className="flex items-center gap-4 mb-4">
          <img
            src="./assets/images/logo-composto-colorido.svg"
            alt="ShipIt! Logo"
            className="h-12 bg-white/90 rounded-md p-1"
          />
          <div>
            <p className="text-foreground font-medium text-base">ShipIt!</p>
            <p className="text-muted-foreground text-sm">Relatório Mensal de Atividades</p>
          </div>
        </div>
        <div className="text-sm text-muted-foreground space-y-1">
          {version && <p>Versão {version}</p>}
          <p>Electron + React + TypeScript</p>
          <p className="pt-2 text-xs">Desenvolvido para gerenciar atividades e gerar relatórios de serviço.</p>
        </div>
      </div>
    </div>
  )
}

export function Header() {
  const [showAbout, setShowAbout] = useState(false)
  const [trashCount, setTrashCount] = useState(0)

  const loadTrashCount = useCallback(async () => {
    if (window.electronAPI) {
      const evidences = await window.electronAPI.getDeletedEvidences()
      setTrashCount(evidences.length)
    }
  }, [])

  useEffect(() => {
    loadTrashCount()
    
    // Listen for trash changes from other components
    const handleTrashChange = () => loadTrashCount()
    window.addEventListener('shipit:trash-changed', handleTrashChange)
    
    return () => {
      window.removeEventListener('shipit:trash-changed', handleTrashChange)
    }
  }, [loadTrashCount])

  return (
    <>
      <header id="header-nav" className="bg-header text-header-foreground px-6 py-3 flex items-center justify-between shadow-md select-none"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <Link
          id="header-logo"
          to="/"
          className="flex items-center gap-2 no-underline text-header-foreground hover:opacity-90 transition-opacity"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <img
            src="./assets/images/logo-composto-colorido.svg"
            alt="ShipIt! Logo"
            className="h-8 bg-white/90 rounded-md p-0.75"
          />
        </Link>

        <nav
          id="header-nav-links"
          className="flex items-center gap-4"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <Link
            id="header-link-dashboard"
            to="/"
            className="text-header-foreground/80 hover:text-header-foreground transition-colors rounded focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            title="Dashboard"
            aria-label="Dashboard"
          >
            <i className="fa-solid fa-chart-line text-lg" aria-hidden="true"></i>
          </Link>

          <Link
            id="header-link-activities"
            to="/activities"
            className="text-header-foreground/80 hover:text-header-foreground transition-colors rounded focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            title="Atividades"
            aria-label="Atividades"
          >
            <i className="fa-solid fa-list-check text-lg" aria-hidden="true"></i>
          </Link>

          <Link
            id="header-link-profile"
            to="/profile"
            className="text-header-foreground/80 hover:text-header-foreground transition-colors rounded focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            title="Perfil"
            aria-label="Perfil"
          >
            <i className="fa-solid fa-user text-lg" aria-hidden="true"></i>
          </Link>

          <Link
            id="header-link-settings"
            to="/settings"
            className="text-header-foreground/80 hover:text-header-foreground transition-colors rounded focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            title="Configurações"
            aria-label="Configurações"
          >
            <i className="fa-solid fa-gear text-lg" aria-hidden="true"></i>
          </Link>

          <Link
            id="header-link-trash"
            to="/trash"
            className="text-header-foreground/80 hover:text-header-foreground transition-colors relative rounded focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            title="Lixeira"
            aria-label="Lixeira"
          >
            <i className="fa-solid fa-trash-can text-lg"></i>
            {trashCount > 0 && (
              <span id="header-trash-badge" className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground text-[10px] font-bold min-w-4 h-4 flex items-center justify-center rounded-full px-1">
                {trashCount > 99 ? '99+' : trashCount}
              </span>
            )}
          </Link>

          <button
            id="header-btn-about"
            onClick={() => setShowAbout(true)}
            className="text-header-foreground/80 hover:text-header-foreground transition-colors cursor-pointer rounded focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            title="Sobre o ShipIt!"
            aria-label="Sobre o ShipIt!"
          >
            <i className="fa-solid fa-circle-info text-lg" aria-hidden="true"></i>
          </button>
        </nav>
      </header>

      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}
    </>
  )
}
