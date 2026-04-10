import { Outlet } from 'react-router-dom'
import { TitleBar } from './TitleBar'
import { ActivityBar } from './ActivityBar'

export function AppLayout() {
  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      {/* Title bar - fixed at top */}
      <TitleBar />
      
      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Activity bar - fixed on left */}
        <ActivityBar />
        
        {/* Scrollable content */}
        <main className="flex-1 overflow-auto p-6 animate-page-in">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
