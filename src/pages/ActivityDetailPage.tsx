import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { ActivityData } from '../vite-env'
import { localDb } from '../services/localDb'

const STATUS_COLORS: Record<string, string> = {
  'Em andamento': 'bg-brand-blue/15 text-primary',
  'Concluído': 'bg-success/15 text-success',
  'Cancelado': 'bg-destructive/15 text-destructive',
  'Pendente': 'bg-warning/15 text-warning-foreground',
}

export function ActivityDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [activity, setActivity] = useState<ActivityData | null>(null)
  const [loading, setLoading] = useState(true)

  const loadActivity = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      let data: ActivityData | null
      if (window.electronAPI) {
        data = await window.electronAPI.getActivity(id)
      } else {
        data = localDb.getActivity(id)
      }
      setActivity(data)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadActivity()
  }, [loadActivity])

  function formatDate(d: string | null): string {
    if (!d) return '—'
    return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR')
  }

  function parseLinks(linkRef: string | null): string[] {
    if (!linkRef) return []
    return linkRef.split('\n').map((l) => l.trim()).filter(Boolean)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <i className="fa-solid fa-spinner fa-spin text-3xl text-muted-foreground"></i>
      </div>
    )
  }

  if (!activity) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground text-lg">Atividade não encontrada.</p>
        <button
          onClick={() => navigate('/activities')}
          className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg cursor-pointer"
        >
          Voltar
        </button>
      </div>
    )
  }

  const links = parseLinks(activity.link_ref)

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/activities?month=${activity.month_reference}`)}
            className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title="Voltar"
          >
            <i className="fa-solid fa-arrow-left text-lg"></i>
          </button>
          <h1 className="text-2xl font-bold">Detalhes da Atividade</h1>
        </div>
        <button
          onClick={() => navigate(`/activities/${activity.id}/edit`)}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg
            hover:opacity-90 transition-opacity cursor-pointer flex items-center gap-2"
        >
          <i className="fa-solid fa-pen-to-square"></i>
          Editar
        </button>
      </div>

      {/* Info card */}
      <div className="bg-card border border-border rounded-lg p-6 space-y-5">
        {/* Status + Period */}
        <div className="flex flex-wrap items-center gap-4">
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[activity.status] || ''}`}
          >
            {activity.status}
          </span>
          <span className="text-sm text-muted-foreground">
            <i className="fa-regular fa-calendar mr-1"></i>
            {formatDate(activity.date_start)} — {formatDate(activity.date_end)}
          </span>
          {activity.attendance_type && (
            <span className="text-sm text-muted-foreground">
              <i className="fa-solid fa-location-dot mr-1"></i>
              {activity.attendance_type}
            </span>
          )}
          <span className="text-sm text-muted-foreground">
            <i className="fa-solid fa-calendar-days mr-1"></i>
            Ref: {activity.month_reference}
          </span>
        </div>

        {/* Description */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Descrição</h3>
          <div className="text-foreground whitespace-pre-wrap leading-relaxed">
            {activity.description || (
              <span className="text-muted-foreground italic">Sem descrição</span>
            )}
          </div>
        </div>

        {/* Links */}
        {links.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">
              Links de Referência
            </h3>
            <ul className="space-y-1">
              {links.map((link, i) => (
                <li key={i}>
                  <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline break-all text-sm"
                  >
                    <i className="fa-solid fa-link mr-1 text-xs"></i>
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Evidences */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">
            Evidências ({activity.evidences?.length || 0})
          </h3>

          {(!activity.evidences || activity.evidences.length === 0) ? (
            <p className="text-sm text-muted-foreground italic">
              Nenhuma evidência anexada.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {activity.evidences.map((ev) => (
                <div
                  key={ev.id}
                  className="border border-border rounded-lg overflow-hidden"
                >
                  <div className="aspect-video bg-muted flex items-center justify-center overflow-hidden">
                    <img
                      src={
                        ev.file_path.startsWith('data:')
                          ? ev.file_path
                          : `shipit-evidence://host?path=${encodeURIComponent(ev.file_path)}`
                      }
                      alt={ev.caption || 'Evidência'}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        ;(e.target as HTMLImageElement).style.display = 'none'
                      }}
                    />
                  </div>
                  {ev.caption && (
                    <p className="p-2 text-sm text-muted-foreground border-t border-border">
                      {ev.caption}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Meta */}
        <div className="text-xs text-muted-foreground pt-3 border-t border-border">
          Última atualização: {new Date(activity.last_updated).toLocaleString('pt-BR')}
        </div>
      </div>
    </div>
  )
}
