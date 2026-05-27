import { NavLink, useNavigate } from 'react-router-dom'
import { useState, useEffect, useCallback } from 'react'
import { UPDATE_SETTINGS_ROUTE, useUpdateState } from '../contexts/UpdateStateContext'

interface NavItem {
  to: string
  icon: string
  title: string
  badge?: number
  id: string
}

export function ActivityBar() {
  const navigate = useNavigate()
  const [trashCount, setTrashCount] = useState(0)
  const { updateStatus } = useUpdateState()

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
    { to: '/', icon: 'fa-chart-line', title: 'Dashboard', id: 'sidebar-link-dashboard' },
    { to: '/activities', icon: 'fa-list-check', title: 'Atividades', id: 'sidebar-link-activities' },
    { to: '/profile', icon: 'fa-user', title: 'Perfil', id: 'sidebar-link-profile' },
  ]

  const bottomNav: NavItem[] = [
    { to: '/trash', icon: 'fa-trash-can', title: 'Lixeira', badge: trashCount, id: 'sidebar-link-trash' },
    { to: '/settings', icon: 'fa-gear', title: 'Configurações', id: 'sidebar-link-settings' },
  ]

  return (
    <aside id="sidebar" className="w-12 bg-activitybar flex flex-col items-center py-2 shrink-0">
        {/* Main navigation */}
        <nav id="sidebar-nav-main" className="flex-1 flex flex-col items-center gap-1">
          {mainNav.map((item) => (
            <NavLink
              key={item.to}
              id={item.id}
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
        <nav id="sidebar-nav-bottom" className="flex flex-col items-center gap-1 pb-1">
          {bottomNav.map((item) => (
            <NavLink
              key={item.to}
              id={item.id}
              to={item.to}
              onClick={(event) => {
                if (item.id === 'sidebar-link-settings' && updateStatus.attentionVisible) {
                  event.preventDefault()
                  navigate(UPDATE_SETTINGS_ROUTE)
                }
              }}
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
                <span id={item.to === '/trash' ? 'sidebar-trash-badge' : undefined} className="absolute top-1.5 right-1.5 bg-accent text-accent-foreground text-[9px] font-bold min-w-3.5 h-3.5 flex items-center justify-center rounded-full px-0.5">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
              {item.id === 'sidebar-link-settings' && updateStatus.attentionVisible && (
                <span
                  id="sidebar-settings-update-badge"
                  className="shipit-attention-badge pointer-events-none absolute top-2 right-2 inline-flex h-2.5 w-2.5 rounded-full bg-accent ring-2 ring-activitybar"
                  aria-hidden="true"
                ></span>
              )}
            </NavLink>
          ))}
          
          {/* About button */}
          <button
            id="sidebar-btn-about"
            onClick={() => navigate('/about')}
            className="w-12 h-12 flex items-center justify-center text-activitybar-foreground hover:text-activitybar-foreground-active transition-colors cursor-pointer"
            title="Sobre o ShipIt!"
            aria-label="Sobre o ShipIt!"
          >
            <i className="fa-solid fa-circle-info text-xl" aria-hidden="true"></i>
          </button>
        </nav>
    </aside>
  )
}
