export interface ParseSvnReleasesResult {
  tags: string[]
  invalidTokens: string[]
}

const SVN_RELEASE_TOKEN_REGEX = /^\d+$/

function splitTokens(raw: string): string[] {
  return raw
    .split(/[\n,;]+/)
    .map((token) => token.trim())
    .filter(Boolean)
}

export function normalizeSvnReleaseToken(rawToken: string): string | null {
  const token = rawToken.trim()
  if (!token) return null
  return SVN_RELEASE_TOKEN_REGEX.test(token) ? token : null
}

export function isValidSvnReleaseToken(rawToken: string): boolean {
  return normalizeSvnReleaseToken(rawToken) !== null
}

export function parseSvnReleasesInput(raw: string): ParseSvnReleasesResult {
  const tokens = splitTokens(raw)
  const tags: string[] = []
  const invalidTokens: string[] = []
  const validSet = new Set<string>()
  const invalidSet = new Set<string>()

  for (const token of tokens) {
    const normalized = normalizeSvnReleaseToken(token)
    if (normalized) {
      if (!validSet.has(normalized)) {
        validSet.add(normalized)
        tags.push(normalized)
      }
      continue
    }

    if (!invalidSet.has(token)) {
      invalidSet.add(token)
      invalidTokens.push(token)
    }
  }

  return { tags, invalidTokens }
}

export function parseSvnReleasesStored(raw: string | null | undefined): string[] {
  if (!raw) return []
  return parseSvnReleasesInput(raw).tags
}

export function serializeSvnReleases(tags: string[]): string | null {
  const uniqueTags: string[] = []
  const set = new Set<string>()

  for (const tag of tags) {
    const normalized = normalizeSvnReleaseToken(tag)
    if (!normalized || set.has(normalized)) continue
    set.add(normalized)
    uniqueTags.push(normalized)
  }

  return uniqueTags.length > 0 ? uniqueTags.join(',') : null
}
