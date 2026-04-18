import { Outlet, useLocation } from 'react-router-dom'
import { TitleBar } from './TitleBar'
import { ActivityBar } from './ActivityBar'

export function AppLayout() {
  const location = useLocation()

  return (
    <div id="app-layout" className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      {/* Title bar - fixed at top */}
      <TitleBar />
      
      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Activity bar - fixed on left */}
        <ActivityBar />
        
        {/* Scrollable content */}
        <main id="app-main" key={location.pathname} className="flex-1 overflow-auto p-6 animate-page-in">
          <div id="app-content">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
