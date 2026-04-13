import { NavLink } from 'react-router-dom'
import { useState, useEffect, useCallback } from 'react'

interface NavItem {
  to: string
  icon: string
  title: string
  badge?: number
}

export function ActivityBar() {
  const [trashCount, setTrashCount] = useState(0)
  const [showAbout, setShowAbout] = useState(false)

  const loadTrashCount = useCallback(async () => {
    if (window.electronAPI) {
      const evidences = await window.electronAPI.getDeletedEvidences()
      setTrashCount(evidences.length)
    }
  }, [])

  useEffect(() => {
    loadTrashCount()
    const handleTrashChange = () => loadTrashCount()
    window.addEventListener('shipit:trash-changed', handleTrashChange)
    return () => window.removeEventListener('shipit:trash-changed', handleTrashChange)
  }, [loadTrashCount])

  const mainNav: NavItem[] = [
    { to: '/', icon: 'fa-chart-line', title: 'Dashboard' },
    { to: '/activities', icon: 'fa-list-check', title: 'Atividades' },
    { to: '/profile', icon: 'fa-user', title: 'Perfil' },
  ]

  const bottomNav: NavItem[] = [
    { to: '/trash', icon: 'fa-trash-can', title: 'Lixeira', badge: trashCount },
    { to: '/settings', icon: 'fa-gear', title: 'Configurações' },
  ]

  return (
    <>
      <aside className="w-12 bg-activitybar flex flex-col items-center py-2 shrink-0">
        {/* Main navigation */}
        <nav className="flex-1 flex flex-col items-center gap-1">
          {mainNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `w-12 h-12 flex items-center justify-center relative transition-colors group ${
                  isActive
                    ? 'text-activitybar-foreground-active before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-6 before:w-0.5 before:bg-activitybar-foreground-active before:rounded-r'
                    : 'text-activitybar-foreground hover:text-activitybar-foreground-active'
                }`
              }
              title={item.title}
              aria-label={item.title}
            >
              <i className={`fa-solid ${item.icon} text-xl`} aria-hidden="true"></i>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="absolute top-1.5 right-1.5 bg-accent text-accent-foreground text-[9px] font-bold min-w-3.5 h-3.5 flex items-center justify-center rounded-full px-0.5">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom navigation */}
        <nav className="flex flex-col items-center gap-1 pb-1">
          {bottomNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `w-12 h-12 flex items-center justify-center relative transition-colors ${
                  isActive
                    ? 'text-activitybar-foreground-active before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-6 before:w-0.5 before:bg-activitybar-foreground-active before:rounded-r'
                    : 'text-activitybar-foreground hover:text-activitybar-foreground-active'
                }`
              }
              title={item.title}
              aria-label={item.title}
            >
              <i className={`fa-solid ${item.icon} text-xl`} aria-hidden="true"></i>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="absolute top-1.5 right-1.5 bg-accent text-accent-foreground text-[9px] font-bold min-w-3.5 h-3.5 flex items-center justify-center rounded-full px-0.5">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </NavLink>
          ))}
          
          {/* About button */}
          <button
            onClick={() => setShowAbout(true)}
            className="w-12 h-12 flex items-center justify-center text-activitybar-foreground hover:text-activitybar-foreground-active transition-colors cursor-pointer"
            title="Sobre o ShipIt!"
            aria-label="Sobre o ShipIt!"
          >
            <i className="fa-solid fa-circle-info text-xl" aria-hidden="true"></i>
          </button>
        </nav>
      </aside>

      {/* About Modal */}
      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}
    </>
  )
}

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="about-modal-title-sidebar">
      <div
        className="bg-card border border-border rounded-lg p-6 shadow-xl max-w-sm w-full mx-4 animate-modal-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 id="about-modal-title-sidebar" className="text-lg font-semibold flex items-center gap-2">
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
        <p className="text-sm text-muted-foreground leading-relaxed mb-3">
          Registre suas atividades ao longo do mês, anexe evidências e gere
          o relatório pronto com um clique. Simples assim.
        </p>
        <div className="text-sm text-muted-foreground space-y-1">
          {version && <p><span className="text-foreground font-medium">Versão</span> {version}</p>}
          <div className="pt-2 border-t border-border/50">
            <p className="text-foreground font-medium">Mauro Rocha Tavares</p>
            <a href="mailto:mauro.rocha.t@gmail.com" className="text-primary hover:underline text-xs">
              mauro.rocha.t@gmail.com
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
