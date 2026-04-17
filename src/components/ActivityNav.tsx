import { useNavigate } from 'react-router-dom'
import type { ActivityData } from '../vite-env'

export type NavMode = 'month' | 'scope'

interface ActivityNavProps {
  siblings: ActivityData[]
  currentId: string
  currentProjectScope: string | null
  navMode: NavMode
  onNavModeChange: (mode: NavMode) => void
}

export function ActivityNav({
  siblings,
  currentId,
  currentProjectScope,
  navMode,
  onNavModeChange,
}: ActivityNavProps) {
  const navigate = useNavigate()

  const scopeDisabled = !currentProjectScope
  const effectiveMode = scopeDisabled && navMode === 'scope' ? 'month' : navMode

  const filtered =
    effectiveMode === 'scope'
      ? siblings.filter((a) => a.project_scope === currentProjectScope)
      : siblings

  const currentIndex = filtered.findIndex((a) => a.id === currentId)
  const prev = currentIndex > 0 ? filtered[currentIndex - 1] : null
  const next = currentIndex < filtered.length - 1 ? filtered[currentIndex + 1] : null

  function truncate(text: string, max = 50) {
    return text.length > max ? text.slice(0, max) + '…' : text
  }

  return (
    <div className="flex items-center justify-between gap-3">
      {/* Previous */}
      <button
        disabled={!prev}
        onClick={() => prev && navigate(`/activities/${prev.id}`)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors
          disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer min-w-0 flex-1 justify-start"
        title={prev ? truncate(prev.description) : 'Sem atividade anterior'}
        aria-label={prev ? `Atividade anterior: ${truncate(prev.description)}` : 'Sem atividade anterior'}
      >
        <i className="fa-solid fa-chevron-left shrink-0" aria-hidden="true"></i>
        <span className="flex flex-col items-start min-w-0">
          <span className="font-medium">Anterior</span>
          {prev && (
            <span className="text-xs truncate max-w-48">{truncate(prev.description)}</span>
          )}
        </span>
      </button>

      {/* Mode toggle */}
      <div className="flex items-center gap-1 shrink-0 bg-muted rounded-lg p-0.5">
        <button
          onClick={() => onNavModeChange('month')}
          className={`px-2.5 py-1 text-xs rounded-md transition-colors cursor-pointer ${
            effectiveMode === 'month'
              ? 'bg-primary text-primary-foreground font-medium'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          title="Navegar por mês"
          aria-label="Navegar por mês"
        >
          <i className="fa-solid fa-calendar-days mr-1" aria-hidden="true"></i>
          Mês
        </button>
        <button
          onClick={() => !scopeDisabled && onNavModeChange('scope')}
          disabled={scopeDisabled}
          className={`px-2.5 py-1 text-xs rounded-md transition-colors cursor-pointer
            disabled:opacity-40 disabled:cursor-not-allowed ${
            effectiveMode === 'scope'
              ? 'bg-primary text-primary-foreground font-medium'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          title={scopeDisabled ? 'Atividade sem projeto definido' : 'Navegar por projeto'}
          aria-label={scopeDisabled ? 'Atividade sem projeto definido' : 'Navegar por projeto'}
        >
          <i className="fa-solid fa-diagram-project mr-1" aria-hidden="true"></i>
          Projeto
        </button>
      </div>

      {/* Next */}
      <button
        disabled={!next}
        onClick={() => next && navigate(`/activities/${next.id}`)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors
          disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer min-w-0 flex-1 justify-end"
        title={next ? truncate(next.description) : 'Sem próxima atividade'}
        aria-label={next ? `Próxima atividade: ${truncate(next.description)}` : 'Sem próxima atividade'}
      >
        <span className="flex flex-col items-end min-w-0">
          <span className="font-medium">Próxima</span>
          {next && (
            <span className="text-xs truncate max-w-48">{truncate(next.description)}</span>
          )}
        </span>
        <i className="fa-solid fa-chevron-right shrink-0" aria-hidden="true"></i>
      </button>
    </div>
  )
}
