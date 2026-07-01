import type { ActivityEnvironment } from '../vite-env'
import {
  ENVIRONMENTS,
  ENVIRONMENT_ICONS,
  ENVIRONMENT_SELECTED_COLORS,
} from '../utils/environmentColors'

interface EnvironmentSelectorProps {
  value: ActivityEnvironment | ''
  onChange: (value: ActivityEnvironment | '') => void
  id?: string
}

/**
 * Seletor segmentado do ambiente da atividade (uso interno).
 * Três botões coloridos (verde/amarelo/vermelho); clicar no já selecionado
 * limpa a seleção (campo opcional).
 */
export function EnvironmentSelector({ value, onChange, id }: EnvironmentSelectorProps) {
  return (
    <div id={id} className="flex flex-wrap gap-2" role="group" aria-label="Ambiente da atividade">
      {ENVIRONMENTS.map((env) => {
        const selected = value === env
        return (
          <button
            key={env}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(selected ? '' : env)}
            className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors cursor-pointer ${
              selected
                ? ENVIRONMENT_SELECTED_COLORS[env]
                : 'bg-muted/40 text-muted-foreground border-transparent hover:bg-muted hover:text-foreground'
            }`}
          >
            <i className={`fa-solid ${ENVIRONMENT_ICONS[env]}`} aria-hidden="true"></i>
            {env}
          </button>
        )
      })}
    </div>
  )
}
