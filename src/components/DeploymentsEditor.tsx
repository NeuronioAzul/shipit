import { useRef, useState } from 'react'
import type { ActivityEnvironment } from '../vite-env'
import type { Deployment } from '../utils/deployments'
import {
  ENVIRONMENTS,
  ENVIRONMENT_ABBR,
  ENVIRONMENT_ICONS,
  ENVIRONMENT_SELECTED_COLORS,
} from '../utils/environmentColors'
import { normalizeSvnReleaseToken } from '../utils/svnReleases'
import { InputTags } from './InputTags'

interface DeploymentsEditorProps {
  value: Deployment[]
  onChange: (next: Deployment[]) => void
  idPrefix?: string
}

const TRACK_DOT_COLORS: Record<ActivityEnvironment, string> = {
  'Desenvolvimento': 'bg-chart-2 border-chart-2',
  'Homologação': 'bg-chart-4 border-chart-4',
  'Produção': 'bg-chart-5 border-chart-5',
}

function validateReleaseTag(rawTag: string): string | null {
  return normalizeSvnReleaseToken(rawTag)
    ? null
    : 'Use apenas números de release SVN, separados por vírgula.'
}

/**
 * Editor de publicações por ambiente (uso interno): uma linha por ambiente na
 * ordem dsv → hmg → prd, com toggle colorido + `InputTags` de releases.
 * Desmarcar uma linha não destrói as releases digitadas: elas ficam retidas
 * localmente e voltam ao re-marcar (só a serialização ignora linhas desmarcadas).
 */
export function DeploymentsEditor({ value, onChange, idPrefix = 'deployments' }: DeploymentsEditorProps) {
  // Releases retidas de linhas desmarcadas nesta sessão de edição.
  const retainedRef = useRef<Partial<Record<ActivityEnvironment, string[]>>>({})
  const [focusRequest, setFocusRequest] = useState<ActivityEnvironment | null>(null)

  const byEnv = new Map<ActivityEnvironment, Deployment>(value.map((item) => [item.environment, item]))

  function emit(next: Map<ActivityEnvironment, Deployment>) {
    onChange(ENVIRONMENTS.filter((env) => next.has(env)).map((env) => next.get(env)!))
  }

  function mark(env: ActivityEnvironment) {
    const next = new Map(byEnv)
    next.set(env, { environment: env, releases: retainedRef.current[env] ?? [] })
    delete retainedRef.current[env]
    emit(next)
    setFocusRequest(env)
  }

  function unmark(env: ActivityEnvironment) {
    const current = byEnv.get(env)
    if (current && current.releases.length > 0) {
      retainedRef.current[env] = current.releases
    }
    const next = new Map(byEnv)
    next.delete(env)
    emit(next)
  }

  function setReleases(env: ActivityEnvironment, releases: string[]) {
    const next = new Map(byEnv)
    next.set(env, { environment: env, releases })
    emit(next)
  }

  /** Ambiente marcado acima (mais próximo) que tenha releases — fonte do atalho "Repetir". */
  function findRepeatSource(env: ActivityEnvironment): Deployment | null {
    const index = ENVIRONMENTS.indexOf(env)
    for (let i = index - 1; i >= 0; i--) {
      const candidate = byEnv.get(ENVIRONMENTS[i])
      if (candidate && candidate.releases.length > 0) return candidate
    }
    return null
  }

  return (
    <div id={idPrefix} className="space-y-1" role="group" aria-label="Publicações por ambiente">
      {ENVIRONMENTS.map((env, index) => {
        const deployment = byEnv.get(env)
        const marked = !!deployment
        const abbr = ENVIRONMENT_ABBR[env]
        const repeatSource = marked && deployment.releases.length === 0 ? findRepeatSource(env) : null
        const isLast = index === ENVIRONMENTS.length - 1

        return (
          <div
            key={env}
            className="grid grid-cols-[auto_auto_1fr] items-start gap-x-3"
            data-environment={env}
            data-marked={marked}
          >
            {/* Trilho: ponto + linha vertical conectando as linhas */}
            <div className="flex flex-col items-center self-stretch pt-3" aria-hidden="true">
              <span
                className={`h-3 w-3 rounded-full border-2 transition-colors ${
                  marked ? TRACK_DOT_COLORS[env] : 'bg-transparent border-border'
                }`}
              ></span>
              {!isLast && <span className="flex-1 w-px min-h-4 bg-border mt-1"></span>}
            </div>

            <button
              type="button"
              id={`${idPrefix}-toggle-${abbr}`}
              aria-pressed={marked}
              onClick={() => (marked ? unmark(env) : mark(env))}
              title={marked ? `Desmarcar publicação em ${env}` : `Marcar publicação em ${env}`}
              className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors cursor-pointer w-44 ${
                marked
                  ? ENVIRONMENT_SELECTED_COLORS[env]
                  : 'bg-muted/40 text-muted-foreground border-transparent hover:bg-muted hover:text-foreground'
              }`}
            >
              <i className={`fa-solid ${marked ? 'fa-circle-check' : ENVIRONMENT_ICONS[env]} text-[0.9em]`} aria-hidden="true"></i>
              {env}
            </button>

            <div className="min-w-0 pb-3">
              {marked ? (
                <div className="space-y-1">
                  <InputTags
                    id={`${idPrefix}-releases-${abbr}`}
                    value={deployment.releases}
                    onChange={(next) => setReleases(env, next)}
                    validateTag={validateReleaseTag}
                    normalizeTag={(tag) => normalizeSvnReleaseToken(tag) || ''}
                    placeholder="Releases SVN (opcional) — ex: 12345, 12346"
                    autoFocus={focusRequest === env}
                    onFocus={() => { if (focusRequest === env) setFocusRequest(null) }}
                  />
                  {repeatSource && (
                    <button
                      type="button"
                      id={`${idPrefix}-repeat-${abbr}`}
                      className="btn btn-ghost btn-sm text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => setReleases(env, [...repeatSource.releases])}
                    >
                      <i className="fa-solid fa-arrow-turn-down text-[10px]" aria-hidden="true"></i>
                      Repetir releases de {repeatSource.environment}
                    </button>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  id={`${idPrefix}-empty-${abbr}`}
                  onClick={() => mark(env)}
                  className="h-10 px-1 text-sm text-muted-foreground/70 italic hover:text-foreground cursor-pointer text-left"
                >
                  Ainda não publicado — clique para marcar.
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
