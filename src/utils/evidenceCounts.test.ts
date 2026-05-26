import { describe, expect, it } from 'vitest'
import type { EvidenceData } from '../vite-env'
import { getEvidenceTypeCounts } from './evidenceCounts'

let nextId = 1

function buildEvidence(type: EvidenceData['type']): EvidenceData {
  const currentId = nextId
  nextId += 1

  return {
    id: `ev-${currentId}`,
    activity_id: 'activity-1',
    type,
    file_path: null,
    text_content: null,
    caption: null,
    sort_index: 0,
    date_added: new Date().toISOString(),
    deleted_at: null,
  }
}

describe('evidenceCounts', () => {
  it('returns zero counts for empty input', () => {
    expect(getEvidenceTypeCounts(undefined)).toEqual({
      imageCount: 0,
      textCount: 0,
      total: 0,
    })

    expect(getEvidenceTypeCounts([])).toEqual({
      imageCount: 0,
      textCount: 0,
      total: 0,
    })
  })

  it('splits mixed evidences by type', () => {
    const evidences: EvidenceData[] = [
      buildEvidence('image'),
      buildEvidence('text'),
      buildEvidence('image'),
      buildEvidence('text'),
      buildEvidence('image'),
    ]

    expect(getEvidenceTypeCounts(evidences)).toEqual({
      imageCount: 3,
      textCount: 2,
      total: 5,
    })
  })

  it('treats unknown legacy type as image for backwards compatibility', () => {
    const legacyEvidence = {
      ...buildEvidence('image'),
      type: undefined,
    } as unknown as EvidenceData

    expect(getEvidenceTypeCounts([legacyEvidence])).toEqual({
      imageCount: 1,
      textCount: 0,
      total: 1,
    })
  })
})
