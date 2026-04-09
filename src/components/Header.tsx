import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

function AboutModal({ onClose }: { onClose: () => void }) {
  const [version, setVersion] = useState('')

  useEffect(() => {
    window.electronAPI?.getVersion().then(setVersion)
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-lg p-6 shadow-xl max-w-sm w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <i className="fa-solid fa-circle-info text-primary"></i>
            Sobre o ShipIt!
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>
        <div className="flex items-center gap-4 mb-4">
          <img
            src="/images/logo-composto-colorido.svg"
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

  return (
    <>
      <header className="bg-header text-header-foreground px-6 py-3 flex items-center justify-between shadow-md select-none"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <Link
          to="/"
          className="flex items-center gap-2 no-underline text-header-foreground hover:opacity-90 transition-opacity"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <img
            src="/images/logo-composto-colorido.svg"
            alt="ShipIt! Logo"
            className="h-8 bg-white/90 rounded-md p-[3px]"
          />
        </Link>

        <nav
          className="flex items-center gap-4"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <Link
            to="/"
            className="text-header-foreground/80 hover:text-header-foreground transition-colors"
            title="Dashboard"
          >
            <i className="fa-solid fa-chart-line text-lg"></i>
          </Link>

          <Link
            to="/activities"
            className="text-header-foreground/80 hover:text-header-foreground transition-colors"
            title="Atividades"
          >
            <i className="fa-solid fa-list-check text-lg"></i>
          </Link>

          <Link
            to="/profile"
            className="text-header-foreground/80 hover:text-header-foreground transition-colors"
            title="Perfil"
          >
            <i className="fa-solid fa-user text-lg"></i>
          </Link>

          <Link
            to="/settings"
            className="text-header-foreground/80 hover:text-header-foreground transition-colors"
            title="Configurações"
          >
            <i className="fa-solid fa-gear text-lg"></i>
          </Link>

          <button
            onClick={() => setShowAbout(true)}
            className="text-header-foreground/80 hover:text-header-foreground transition-colors cursor-pointer"
            title="Sobre o ShipIt!"
          >
            <i className="fa-solid fa-circle-info text-lg"></i>
          </button>
        </nav>
      </header>

      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}
    </>
  )
}
