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
    <div className="flex flex-col items-center justify-center h-full gap-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Bem-vindo ao Ship<span className="text-accent">It!</span>
        </h1>
        <p className="text-muted-foreground">
          Seu perfil está configurado. Gerencie suas atividades mensais abaixo.
        </p>
      </div>
      <div className="flex gap-3">
        <button
          onClick={() => navigate('/activities')}
          className="px-6 py-2.5 bg-accent text-accent-foreground font-semibold rounded-lg
            hover:opacity-90 transition-all cursor-pointer shadow-md flex items-center gap-2"
        >
          <i className="fa-solid fa-clipboard-list mr-1"></i>
          Atividades
        </button>
        <button
          onClick={() => navigate('/profile')}
          className="px-4 py-2.5 border border-border text-foreground rounded-lg
            hover:bg-muted transition-colors cursor-pointer flex items-center gap-2"
        >
          <i className="fa-solid fa-gear"></i>
          Editar Perfil
        </button>
      </div>
    </div>
  )
}
