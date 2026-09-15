import { useState, type MouseEvent } from 'react'
import type { ActivityData } from '../vite-env'
import { htmlToPlainText } from '../utils/richText'
import { formatShortDate, getActivityDays, getDayAtPointer, getTimelineDays } from '../utils/timelineDays'

interface TimelineChartProps {
  activities: ActivityData[]
  /** Mês de referência `MM/YYYY`. */
  monthRef: string
  /** Chamado ao clicar no rótulo ou na barra de uma atividade. */
  onSelect: (activityId: string) => void
}

/**
 * Variante de container query para o modo "completo" (linhas divisórias + letras dos dias).
 * O valor deve bater com `FULL_DENSITY_MIN_TRACK_PX` em `utils/timelineDays.ts`.
 */
const FULL = '@min-[682px]'

/** Cor da barra por status (mesmo mapeamento dos cards do Dashboard). */
function getBarColor(status: ActivityData['status']): string {
  switch (status) {
    case 'Concluído':
      return 'bg-chart-2'
    case 'Cancelado':
      return 'bg-chart-5'
    case 'Em andamento':
      return 'bg-chart-3'
    default:
      return 'bg-chart-4'
  }
}

/**
 * Linha do tempo mensal do Dashboard: uma coluna por dia (com cabeçalho número + letra
 * do dia da semana), barras por atividade e destaque da coluna sob o ponteiro.
 *
 * Layout em duas colunas (rótulos + trilha) para que cabeçalho, colunas de fundo e
 * barras compartilhem exatamente a mesma largura e a mesma escala `100 / n %`.
 */
export function TimelineChart({ activities, monthRef, onSelect }: TimelineChartProps) {
  const [hoveredDay, setHoveredDay] = useState<number | null>(null)
  const days = getTimelineDays(monthRef)
  const dayCount = days.length
  const dayWidth = `${100 / dayCount}%`

  function handleMouseMove(event: MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect()
    const day = getDayAtPointer(event.clientX - rect.left, rect.width, dayCount)
    // Só re-renderiza quando o dia sob o ponteiro muda
    setHoveredDay((previous) => (previous === day ? previous : day))
  }

  return (
    <div className="min-w-150 flex">
      {/* Coluna de rótulos das atividades */}
      <div className="w-35 shrink-0">
        <div className="h-8" aria-hidden="true" />
        {activities.map((activity, idx) => {
          const description = htmlToPlainText(activity.description)
          return (
            <div
              key={activity.id}
              data-activity-label={activity.id}
              className="h-7 flex items-center text-xs text-foreground truncate pr-2 cursor-pointer hover:text-primary"
              title={description}
              onClick={() => onSelect(activity.id)}
            >
              <span className="truncate">
                {idx + 1}. {description.substring(0, 18) || 'Sem desc.'}
              </span>
            </div>
          )
        })}
      </div>

      {/* Trilha: container query decide a densidade; o hover é calculado pela posição do ponteiro */}
      <div
        id="dashboard-gantt-track"
        className="flex-1 min-w-0 relative @container"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredDay(null)}
      >
        {/* Camada de colunas (fundo): fim de semana, hover e linhas divisórias */}
        <div id="dashboard-gantt-columns" className="absolute inset-0 flex pointer-events-none" aria-hidden="true">
          {days.map((day) => {
            const isHovered = hoveredDay === day.day
            const fill = isHovered ? 'bg-primary/10' : day.isWeekend ? 'bg-muted/40' : ''
            const divider = day.day > 1 ? `${FULL}:border-l border-border/60` : ''
            return (
              <div
                key={day.day}
                data-day={day.day}
                data-weekend={day.isWeekend}
                data-hovered={isHovered}
                className={`shrink-0 h-full transition-colors duration-100 ${divider} ${fill}`}
                style={{ width: dayWidth }}
              />
            )
          })}
        </div>

        {/* Cabeçalho dos dias: número em cima, letra do dia da semana embaixo */}
        <div id="dashboard-gantt-header" className="relative flex h-8 border-b border-border">
          {days.map((day) => {
            const isHovered = hoveredDay === day.day
            const isMilestone = day.day === 1 || day.day % 5 === 0
            const tone = isHovered
              ? 'text-primary font-semibold'
              : day.isWeekend
                ? 'text-accent font-medium'
                : 'text-muted-foreground'
            return (
              <div
                key={day.day}
                data-day={day.day}
                data-weekend={day.isWeekend}
                data-hovered={isHovered}
                title={day.label}
                className={`shrink-0 flex flex-col items-center justify-end gap-0.5 pb-1 leading-none select-none transition-colors duration-100 ${tone}`}
                style={{ width: dayWidth }}
              >
                <span data-role="day-number" className={`text-[10px] ${isMilestone ? '' : `invisible ${FULL}:visible`}`}>
                  {day.day}
                </span>
                <span data-role="weekday" className={`text-[9px] hidden ${FULL}:block`}>
                  {day.letter}
                </span>
              </div>
            )
          })}
        </div>

        {/* Barras das atividades */}
        {activities.map((activity) => {
          const range = getActivityDays(activity, monthRef)
          return (
            <div key={activity.id} className="relative h-7">
              {range && (
                <div
                  data-activity-bar={activity.id}
                  className={`absolute top-1.5 h-4 rounded-sm ${getBarColor(activity.status)} opacity-80 hover:opacity-100 transition-opacity cursor-pointer`}
                  style={{
                    left: `${((range.start - 1) / dayCount) * 100}%`,
                    width: `${((range.end - range.start + 1) / dayCount) * 100}%`,
                  }}
                  title={`${htmlToPlainText(activity.description)}\n${formatShortDate(activity.date_start)} → ${formatShortDate(activity.date_end)}`}
                  onClick={() => onSelect(activity.id)}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
