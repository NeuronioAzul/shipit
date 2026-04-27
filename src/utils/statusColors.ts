/**
 * Shared status color tokens using chart-* variables for theme consistency.
 * Used across Dashboard, Activities, ActivityDetail, and SearchBar.
 *
 * Semantic mapping:
 *   chart-1 = Total (primary)
 *   chart-2 = Concluído (success)
 *   chart-3 = Em andamento (info/active)
 *   chart-4 = Pendente (warning)
 *   chart-5 = Cancelado (destructive)
 */

export const STATUS_COLORS: Record<string, string> = {
  'Em andamento': 'bg-chart-3/15 text-chart-3',
  'Concluído': 'bg-chart-2/15 text-chart-2',
  'Cancelado': 'bg-chart-5/15 text-chart-5',
  'Pendente': 'bg-chart-4/15 text-chart-4',
}

export const STATUS_ICONS: Record<string, string> = {
  'Em andamento': 'fa-spinner',
  'Concluído': 'fa-check-circle',
  'Cancelado': 'fa-times-circle',
  'Pendente': 'fa-clock',
}
