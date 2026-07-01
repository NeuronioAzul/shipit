import type { ActivityEnvironment } from '../vite-env'
import { ENVIRONMENT_ABBR, ENVIRONMENT_COLORS, ENVIRONMENT_ICONS } from '../utils/environmentColors'

interface EnvironmentBadgeProps {
  environment: ActivityEnvironment | null | undefined
  size?: 'sm' | 'md'
}

/**
 * Pill colorida do ambiente da atividade (uso interno), reutilizada na
 * lista de atividades e no detalhe. Não renderiza nada quando vazio.
 */
export function EnvironmentBadge({ environment, size = 'md' }: EnvironmentBadgeProps) {
  if (!environment) return null

  const sizeClass = size === 'sm' ? 'text-[11px] px-2 py-0.5 gap-1' : 'text-sm px-3 py-1 gap-1.5'

  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold border tracking-wide ${ENVIRONMENT_COLORS[environment]} ${sizeClass}`}
      title={`Ambiente: ${environment}`}
      aria-label={`Ambiente: ${environment}`}
    >
      <i className={`fa-solid ${ENVIRONMENT_ICONS[environment]} text-[0.85em]`} aria-hidden="true"></i>
      {ENVIRONMENT_ABBR[environment]}
    </span>
  )
}
