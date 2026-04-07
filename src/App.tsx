import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext'
import { AppLayout } from './components/AppLayout'
import { HomePage } from './pages/HomePage'
import { ProfilePage } from './pages/ProfilePage'
import { ActivitiesPage } from './pages/ActivitiesPage'
import { ActivityFormPage } from './pages/ActivityFormPage'
import { ActivityDetailPage } from './pages/ActivityDetailPage'

export default function App() {
  return (
    <ThemeProvider defaultTheme="dark">
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/profile" element={<ProfilePage />} />
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
