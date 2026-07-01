import type { ActivityEnvironment } from '../vite-env'

/**
 * Tokens de cor/ícone do ambiente da atividade (uso interno).
 * Espelha o padrão de statusColors.ts, reutilizando as variáveis chart-*
 * para consistência entre temas — sem cores cruas.
 *
 * Mapeamento semântico:
 *   Desenvolvimento (dsv) → chart-2 (verde)
 *   Homologação    (hmg) → chart-4 (amarelo)
 *   Produção       (prd) → chart-5 (vermelho)
 */

export const ENVIRONMENTS: ActivityEnvironment[] = [
  'Desenvolvimento',
  'Homologação',
  'Produção',
]

/** Estilo da pill/badge (estado padrão, exibição em lista/detalhe). */
export const ENVIRONMENT_COLORS: Record<ActivityEnvironment, string> = {
  'Desenvolvimento': 'bg-chart-2/15 text-chart-2 border-chart-2/30',
  'Homologação': 'bg-chart-4/15 text-chart-4 border-chart-4/30',
  'Produção': 'bg-chart-5/15 text-chart-5 border-chart-5/30',
}

/** Estilo realçado do botão selecionado no seletor segmentado. */
export const ENVIRONMENT_SELECTED_COLORS: Record<ActivityEnvironment, string> = {
  'Desenvolvimento': 'bg-chart-2/20 text-chart-2 border-chart-2/50 ring-1 ring-chart-2/40',
  'Homologação': 'bg-chart-4/20 text-chart-4 border-chart-4/50 ring-1 ring-chart-4/40',
  'Produção': 'bg-chart-5/20 text-chart-5 border-chart-5/50 ring-1 ring-chart-5/40',
}

export const ENVIRONMENT_ICONS: Record<ActivityEnvironment, string> = {
  'Desenvolvimento': 'fa-code',
  'Homologação': 'fa-vial',
  'Produção': 'fa-rocket',
}

/** Abreviações exibidas na tag/badge (compactas). */
export const ENVIRONMENT_ABBR: Record<ActivityEnvironment, string> = {
  'Desenvolvimento': 'dsv',
  'Homologação': 'hmg',
  'Produção': 'prd',
}
