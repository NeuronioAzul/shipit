import type { ActivityData } from '../vite-env'
import { parseMonthReference } from './monthReference'

/** Letra do dia da semana em pt-BR, indexada por `Date.getDay()` (0 = domingo). */
export const WEEKDAY_LETTERS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'] as const

/** Largura mínima de uma coluna de dia para caber o número + a letra do dia da semana. */
export const MIN_DAY_WIDTH_PX = 22

/**
 * Largura mínima da trilha para o modo "completo" (linhas divisórias + letras).
 * Deve bater com a variante `@min-[682px]` usada em `components/TimelineChart.tsx`
 * (22px × 31 dias, o pior caso).
 */
export const FULL_DENSITY_MIN_TRACK_PX = MIN_DAY_WIDTH_PX * 31

export interface TimelineDay {
  /** Dia do mês (1..n). */
  day: number
  /** `Date.getDay()`: 0 = domingo … 6 = sábado. */
  weekday: number
  /** Letra do dia da semana (D, S, T, Q, Q, S, S). */
  letter: string
  isWeekend: boolean
  /** Rótulo longo em pt-BR para tooltip, ex.: "sábado, 05/09". */
  label: string
}

/** Lista os dias do mês de referência com os dados necessários para o cabeçalho da linha do tempo. */
export function getTimelineDays(monthReference: string): TimelineDay[] {
  const first = parseMonthReference(monthReference)
  const year = first.getFullYear()
  const month = first.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  return Array.from({ length: daysInMonth }, (_, index) => {
    const date = new Date(year, month, index + 1)
    const weekday = date.getDay()
    return {
      day: index + 1,
      weekday,
      letter: WEEKDAY_LETTERS[weekday],
      isWeekend: weekday === 0 || weekday === 6,
      label: date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' }),
    }
  })
}

/**
 * Converte a posição horizontal do ponteiro (relativa à trilha) no dia correspondente.
 * Retorna `null` fora da trilha ou quando a trilha não tem largura.
 */
export function getDayAtPointer(offsetX: number, trackWidth: number, daysInMonth: number): number | null {
  if (!(trackWidth > 0) || daysInMonth < 1) return null
  if (offsetX < 0 || offsetX >= trackWidth) return null
  const day = Math.floor((offsetX / trackWidth) * daysInMonth) + 1
  return Math.min(daysInMonth, Math.max(1, day))
}

/**
 * Intervalo de dias (1..n) que a atividade ocupa dentro do mês de referência,
 * recortado aos limites do mês. `null` quando falta data ou o período não toca o mês.
 */
export function getActivityDays(
  activity: Pick<ActivityData, 'date_start' | 'date_end'>,
  monthReference: string,
): { start: number; end: number } | null {
  if (!activity.date_start || !activity.date_end) return null

  const first = parseMonthReference(monthReference)
  const monthStart = new Date(first.getFullYear(), first.getMonth(), 1)
  const monthEnd = new Date(first.getFullYear(), first.getMonth() + 1, 0)
  const daysInMonth = monthEnd.getDate()

  const start = new Date(activity.date_start + 'T00:00:00')
  const end = new Date(activity.date_end + 'T00:00:00')
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null
  if (end < monthStart || start > monthEnd) return null

  const clampedStart = start < monthStart ? 1 : start.getDate()
  const clampedEnd = end > monthEnd ? daysInMonth : end.getDate()
  if (clampedEnd < clampedStart) return null

  return { start: clampedStart, end: clampedEnd }
}

/** Formata `YYYY-MM-DD` como `DD/MM` (pt-BR); `—` quando vazio. */
export function formatShortDate(date: string | null): string {
  if (!date) return '—'
  return new Date(date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}
