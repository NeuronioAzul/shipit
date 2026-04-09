import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { Toaster } from 'sonner'
import { ThemeProvider, useTheme } from './contexts/ThemeContext'
import { AppLayout } from './components/AppLayout'
import { HomePage } from './pages/HomePage'
import { ProfilePage } from './pages/ProfilePage'
import { ActivitiesPage } from './pages/ActivitiesPage'
import { ActivityFormPage } from './pages/ActivityFormPage'
import { ActivityDetailPage } from './pages/ActivityDetailPage'
import { SettingsPage } from './pages/SettingsPage'
import { TrashPage } from './pages/TrashPage'

/** Listens for navigation commands from the Electron main process (System Tray) */
function ElectronNavigator() {
  const navigate = useNavigate()
  useEffect(() => {
    if (!window.electronAPI?.onNavigate) return
    return window.electronAPI.onNavigate((path) => navigate(path))
  }, [navigate])
  return null
}

/** Themed Toaster wrapper */
function ThemedToaster() {
  const { theme } = useTheme()
  return (
    <Toaster
      theme={theme}
      position="bottom-right"
      toastOptions={{
        className: 'shipit-toast',
        duration: 4000,
      }}
      richColors
      closeButton
    />
  )
}

export default function App() {
  return (
    <ThemeProvider defaultTheme="dark">
      <BrowserRouter>
        <ElectronNavigator />
        <ThemedToaster />
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/trash" element={<TrashPage />} />
            <Route path="/activities" element={<ActivitiesPage />} />
            <Route path="/activities/new" element={<ActivityFormPage />} />
            <Route path="/activities/:id" element={<ActivityDetailPage />} />
            <Route path="/activities/:id/edit" element={<ActivityFormPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}
