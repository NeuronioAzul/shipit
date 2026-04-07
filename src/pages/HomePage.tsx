import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { EmptyState } from '../components/EmptyState'
import { DashboardPage } from './DashboardPage'

export function HomePage() {
  const navigate = useNavigate()
  const [hasProfile, setHasProfile] = useState<boolean | null>(null)

  useEffect(() => {
    async function checkProfile() {
      if (window.electronAPI) {
        const profile = await window.electronAPI.getUserProfile()
        setHasProfile(!!profile?.full_name)
      } else {
        const stored = localStorage.getItem('shipit-profile')
        setHasProfile(!!stored)
      }
    }
    checkProfile()
  }, [])

  if (hasProfile === null) {
    return (
      <div className="flex items-center justify-center h-full">
        <i className="fa-solid fa-spinner fa-spin text-3xl text-muted-foreground"></i>
      </div>
    )
  }

  if (!hasProfile) {
    return <EmptyState onCreateProfile={() => navigate('/profile')} />
  }

  return <DashboardPage />
}
