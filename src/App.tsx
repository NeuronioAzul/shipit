import { HashRouter, Routes, Route, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Toaster } from 'sonner'
import type { StartupMigrationInfo } from './vite-env'
import { MigrationGate } from './components/MigrationGate'
import { ThemeProvider, useTheme } from './contexts/ThemeContext'
import { NavigationHistoryProvider } from './contexts/NavigationHistoryContext'
import { UpdateStateProvider } from './contexts/UpdateStateContext'
import { AppLayout } from './components/AppLayout'
import { HomePage } from './pages/HomePage'
import { ProfilePage } from './pages/ProfilePage'
import { ActivitiesPage } from './pages/ActivitiesPage'
import { ActivityFormPage } from './pages/ActivityFormPage'
import { ActivityDetailPage } from './pages/ActivityDetailPage'
import { SettingsPage } from './pages/SettingsPage'
import { TrashPage } from './pages/TrashPage'
import { UserManualPage } from './pages/UserManualPage'
import { AboutPage } from './pages/AboutPage'

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
  const { isDark } = useTheme()
  return (
    <Toaster
      theme={isDark ? 'dark' : 'light'}
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

type StartupMigrationState = 'checking' | StartupMigrationInfo | null

/**
 * Antes de montar layout/rotas, pergunta ao main se o banco precisa ser migrado.
 * Se precisar, só o aviso bloqueante é renderizado — nenhuma tela consulta o banco
 * até a migração terminar (ver plano 42).
 */
function useStartupMigration(): [StartupMigrationState, () => void] {
  const [state, setState] = useState<StartupMigrationState>(() => (window.electronAPI ? 'checking' : null))

  useEffect(() => {
    if (!window.electronAPI?.getStartupMigration) {
      setState(null)
      return
    }
    let cancelled = false
    window.electronAPI.getStartupMigration()
      .then((info) => { if (!cancelled) setState(info) })
      .catch(() => { if (!cancelled) setState(null) })
    return () => { cancelled = true }
  }, [])

  return [state, () => setState(null)]
}

export default function App() {
  const [startupMigration, finishStartupMigration] = useStartupMigration()

  if (startupMigration === 'checking') {
    return <div className="fixed inset-0 bg-background" aria-busy="true"></div>
  }

  if (startupMigration) {
    return (
      <ThemeProvider defaultTheme="dark">
        <ThemedToaster />
        <MigrationGate info={startupMigration} onFinished={finishStartupMigration} />
      </ThemeProvider>
    )
  }

  return (
    <ThemeProvider defaultTheme="dark">
      <HashRouter>
        <UpdateStateProvider>
          <NavigationHistoryProvider>
            <ElectronNavigator />
            <ThemedToaster />
            <Routes>
              <Route element={<AppLayout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/trash" element={<TrashPage />} />
                <Route path="/manual" element={<UserManualPage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/activities" element={<ActivitiesPage />} />
                <Route path="/activities/new" element={<ActivityFormPage />} />
                <Route path="/activities/:id" element={<ActivityDetailPage />} />
                <Route path="/activities/:id/edit" element={<ActivityFormPage />} />
              </Route>
            </Routes>
          </NavigationHistoryProvider>
        </UpdateStateProvider>
      </HashRouter>
    </ThemeProvider>
  )
}
