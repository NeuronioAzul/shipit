import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { EmptyState } from '../components/EmptyState'

export function HomePage() {
  const navigate = useNavigate()
  const [hasProfile, setHasProfile] = useState<boolean | null>(null)

  useEffect(() => {
    async function checkProfile() {
      if (window.electronAPI) {
        const profile = await window.electronAPI.getUserProfile()
        setHasProfile(!!profile?.full_name)
      } else {
        // Running in browser (dev without Electron)
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

  // Phase 2.5: Dashboard will replace this
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Bem-vindo ao Ship<span className="text-accent">It!</span>
        </h1>
        <p className="text-muted-foreground">
          Seu perfil está configurado. O dashboard será implementado na Fase 2.5.
        </p>
      </div>
      <button
        onClick={() => navigate('/profile')}
        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity cursor-pointer"
      >
        <i className="fa-solid fa-gear mr-2"></i>
        Editar Perfil
      </button>
    </div>
  )
}
