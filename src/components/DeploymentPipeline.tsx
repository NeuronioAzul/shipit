import type { MouseEvent } from 'react'
import type { ActivityEnvironment } from '../vite-env'
import type { Deployment } from '../utils/deployments'
import {
  ENVIRONMENTS,
  ENVIRONMENT_ABBR,
  ENVIRONMENT_COLORS,
  ENVIRONMENT_ICONS,
} from '../utils/environmentColors'
import { copyTextToClipboard } from '../utils/clipboard'

interface DeploymentPipelineProps {
  deployments: Deployment[]
  size?: 'sm' | 'md'
  /** Mostra os números de release dentro de cada slot marcado. */
  showReleases?: boolean
  /** Releases visíveis por ambiente antes de truncar com "+n". */
  maxReleasesPerEnv?: number
}

/**
 * Exibição das publicações por ambiente como pipeline dsv › hmg › prd.
 * Não renderiza nada quando nenhum ambiente está marcado; quando há ao menos um,
 * mostra os três slots (não marcados apagados) — "até onde essa entrega já foi?".
 */
export function DeploymentPipeline({
  deployments,
  size = 'md',
  showReleases = false,
  maxReleasesPerEnv = 3,
}: DeploymentPipelineProps) {
  if (deployments.length === 0) return null

  const byEnv = new Map<ActivityEnvironment, Deployment>(deployments.map((item) => [item.environment, item]))
  const sizeClass = size === 'sm' ? 'text-[11px] px-2 py-0.5 gap-1' : 'text-sm px-3 py-1 gap-1.5'
  const chevronClass = size === 'sm' ? 'text-[9px]' : 'text-[10px]'

  function handleCopy(event: MouseEvent, release: string) {
    // O card da lista navega ao clique; copiar release não pode abrir o detalhe.
    event.stopPropagation()
    void copyTextToClipboard(release, `Release ${release}`)
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-1" role="list" aria-label="Publicações por ambiente">
      {ENVIRONMENTS.map((env, index) => {
        const deployment = byEnv.get(env)
        const marked = !!deployment
        const releases = deployment?.releases ?? []
        const visible = showReleases ? releases.slice(0, maxReleasesPerEnv) : []
        const hidden = showReleases ? Math.max(0, releases.length - visible.length) : 0
        const label = marked
          ? `Publicado em ${env}${releases.length > 0 ? ` — releases ${releases.join(', ')}` : ''}`
          : `Ainda não publicado em ${env}`

        return (
          <span key={env} className="inline-flex items-center gap-1" role="listitem">
            {index > 0 && (
              <i className={`fa-solid fa-chevron-right ${chevronClass} text-muted-foreground/50`} aria-hidden="true"></i>
            )}
            <span
              className={`inline-flex items-center rounded-full font-semibold border tracking-wide ${sizeClass} ${
                marked
                  ? ENVIRONMENT_COLORS[env]
                  : 'border-dashed border-border text-muted-foreground/60 bg-transparent'
              }`}
              title={label}
              aria-label={label}
              data-environment={env}
              data-marked={marked}
            >
              <i
                className={`fa-solid ${ENVIRONMENT_ICONS[env]} text-[0.85em]`}
                aria-hidden="true"
              ></i>
              {ENVIRONMENT_ABBR[env]}
              {visible.length > 0 && (
                <span className="inline-flex items-center gap-1 font-medium normal-case tracking-normal">
                  <span aria-hidden="true">·</span>
                  {visible.map((release) => (
                    <button
                      type="button"
                      key={release}
                      onClick={(event) => handleCopy(event, release)}
                      className="hover:underline cursor-pointer"
                      title={`Copiar release ${release}`}
                      aria-label={`Copiar release ${release}`}
                    >
                      {release}
                    </button>
                  ))}
                  {hidden > 0 && <span className="opacity-70">+{hidden}</span>}
                </span>
              )}
            </span>
          </span>
        )
      })}
    </span>
  )
}
