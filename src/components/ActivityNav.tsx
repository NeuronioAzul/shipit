import { useNavigate } from 'react-router-dom'
import type { ActivityData } from '../vite-env'

interface ActivityNavProps {
  siblings: ActivityData[]
  currentId: string
  selectedMonth: string
  onChangeMonth: (delta: number) => void
}

export function ActivityNav({
  siblings,
  currentId,
  selectedMonth,
  onChangeMonth,
}: ActivityNavProps) {
  const navigate = useNavigate()

  const currentIndex = siblings.findIndex((a) => a.id === currentId)
  const prev =
    currentIndex > 0
      ? siblings[currentIndex - 1]
      : currentIndex === -1
        ? siblings[siblings.length - 1] ?? null
        : null
  const next =
    currentIndex >= 0 && currentIndex < siblings.length - 1
      ? siblings[currentIndex + 1]
      : currentIndex === -1
        ? siblings[0] ?? null
        : null

  function truncate(text: string, max = 50) {
    return text.length > max ? text.slice(0, max) + '…' : text
  }

  return (
    <div id="activity-nav" className="flex items-center justify-between gap-3">
      {/* Previous */}
      <button
        id="activity-nav-btn-prev"
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

      {/* Month selector */}
      <div id="activity-nav-month-selector" className="flex items-center gap-1.5 shrink-0 bg-muted rounded-lg p-0.5">
        <button
          id="activity-nav-btn-prev-month"
          onClick={() => onChangeMonth(-1)}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-background transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          title="Mês anterior"
          aria-label="Mês anterior"
        >
          <i className="fa-solid fa-chevron-left text-xs" aria-hidden="true"></i>
        </button>
        <span
          id="activity-nav-month-label"
          className="px-2 py-1 min-w-24 text-center text-xs font-semibold tracking-wide tabular-nums"
          aria-live="polite"
        >
          {selectedMonth}
        </span>
        <button
          id="activity-nav-btn-next-month"
          onClick={() => onChangeMonth(1)}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-background transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          title="Próximo mês"
          aria-label="Próximo mês"
        >
          <i className="fa-solid fa-chevron-right text-xs" aria-hidden="true"></i>
        </button>
      </div>

      {/* Next */}
      <button
        id="activity-nav-btn-next"
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
