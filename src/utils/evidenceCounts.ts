import type { EvidenceData } from '../vite-env'

export interface EvidenceTypeCounts {
  imageCount: number
  textCount: number
  total: number
}

export function getEvidenceTypeCounts(
  evidences?: EvidenceData[] | null,
): EvidenceTypeCounts {
  let imageCount = 0
  let textCount = 0

  for (const evidence of evidences ?? []) {
    if (evidence.type === 'text') {
      textCount += 1
    } else {
      // Preserve backwards compatibility with legacy records that may not have a type.
      imageCount += 1
    }
  }

  return {
    imageCount,
    textCount,
    total: imageCount + textCount,
  }
}
