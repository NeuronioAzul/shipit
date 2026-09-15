import type { ActivityEnvironment } from '../vite-env'
import { ENVIRONMENTS } from './environmentColors'
import { normalizeSvnReleaseToken } from './svnReleases'

/**
 * Publicações por ambiente de uma atividade (uso interno, não exportado no DOCX).
 *
 * Formato persistido em `Activity.deployments` (JSON):
 *   { "Desenvolvimento": ["12345", "12346"], "Homologação": [] }
 * Chave presente = ambiente marcado como publicado; array vazio = publicado sem
 * release anotada. Vazio/sem marcação → `null` (nunca `'{}'`).
 *
 * Em memória a lista está sempre na ordem fixa dsv → hmg → prd.
 */
export interface Deployment {
  environment: ActivityEnvironment
  releases: string[]
}

export type DeploymentsStored = Partial<Record<ActivityEnvironment, string[]>>

const ENVIRONMENT_SET = new Set<string>(ENVIRONMENTS)

function isEnvironment(value: string): value is ActivityEnvironment {
  return ENVIRONMENT_SET.has(value)
}

/** Normaliza e deduplica releases preservando a ordem de entrada. */
function normalizeReleases(releases: unknown): string[] {
  if (!Array.isArray(releases)) return []
  const seen = new Set<string>()
  const result: string[] = []
  for (const raw of releases) {
    if (typeof raw !== 'string' && typeof raw !== 'number') continue
    const token = normalizeSvnReleaseToken(String(raw))
    if (!token || seen.has(token)) continue
    seen.add(token)
    result.push(token)
  }
  return result
}

/** Ordena pela ordem canônica dos ambientes (dsv → hmg → prd). */
function sortByEnvironment(list: Deployment[]): Deployment[] {
  return [...list].sort(
    (a, b) => ENVIRONMENTS.indexOf(a.environment) - ENVIRONMENTS.indexOf(b.environment),
  )
}

/**
 * Converte o JSON persistido em lista ordenada. Tolerante a JSON inválido
 * (retorna `[]`) e ignora chaves que não sejam ambientes conhecidos.
 */
export function parseDeployments(raw: string | null | undefined): Deployment[] {
  if (!raw) return []

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return []
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return []

  const list: Deployment[] = []
  for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
    if (!isEnvironment(key)) continue
    list.push({ environment: key, releases: normalizeReleases(value) })
  }
  return sortByEnvironment(list)
}

/**
 * Serializa para o formato persistido. Deduplica ambientes (o último vence),
 * normaliza releases e devolve `null` quando não há nenhum ambiente marcado.
 */
export function serializeDeployments(list: Deployment[]): string | null {
  const byEnv = new Map<ActivityEnvironment, string[]>()
  for (const item of list) {
    if (!isEnvironment(item.environment)) continue
    byEnv.set(item.environment, normalizeReleases(item.releases))
  }
  if (byEnv.size === 0) return null

  const stored: DeploymentsStored = {}
  for (const env of ENVIRONMENTS) {
    const releases = byEnv.get(env)
    if (releases) stored[env] = releases
  }
  return JSON.stringify(stored)
}

export function isDeployedTo(list: Deployment[], environment: ActivityEnvironment): boolean {
  return list.some((item) => item.environment === environment)
}

/** Todas as releases, em ordem de ambiente, sem repetição. */
export function getAllReleases(list: Deployment[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const item of sortByEnvironment(list)) {
    for (const release of item.releases) {
      if (seen.has(release)) continue
      seen.add(release)
      result.push(release)
    }
  }
  return result
}
