import { describe, expect, it } from 'vitest'
import {
  isValidSvnReleaseToken,
  normalizeSvnReleaseToken,
  parseSvnReleasesInput,
  parseSvnReleasesStored,
  serializeSvnReleases,
} from './svnReleases'

describe('svnReleases', () => {
  it('normalizes valid numeric tokens', () => {
    expect(normalizeSvnReleaseToken('12345')).toBe('12345')
    expect(normalizeSvnReleaseToken('  987  ')).toBe('987')
  })

  it('rejects invalid tokens', () => {
    expect(normalizeSvnReleaseToken('')).toBeNull()
    expect(normalizeSvnReleaseToken('r123')).toBeNull()
    expect(normalizeSvnReleaseToken('12a3')).toBeNull()
  })

  it('validates tokens correctly', () => {
    expect(isValidSvnReleaseToken('123')).toBe(true)
    expect(isValidSvnReleaseToken(' 456 ')).toBe(true)
    expect(isValidSvnReleaseToken('abc')).toBe(false)
  })

  it('parses csv and removes duplicates preserving order', () => {
    const parsed = parseSvnReleasesInput('101, 202, 101, 303')
    expect(parsed.tags).toEqual(['101', '202', '303'])
    expect(parsed.invalidTokens).toEqual([])
  })

  it('accepts comma, semicolon and newline separators', () => {
    const parsed = parseSvnReleasesInput('10;20\n30,40')
    expect(parsed.tags).toEqual(['10', '20', '30', '40'])
  })

  it('collects invalid tokens without duplicating the same invalid value', () => {
    const parsed = parseSvnReleasesInput('1,ab,2,ab,3,r4')
    expect(parsed.tags).toEqual(['1', '2', '3'])
    expect(parsed.invalidTokens).toEqual(['ab', 'r4'])
  })

  it('parses stored csv safely', () => {
    expect(parseSvnReleasesStored(null)).toEqual([])
    expect(parseSvnReleasesStored(undefined)).toEqual([])
    expect(parseSvnReleasesStored('11,22,33')).toEqual(['11', '22', '33'])
  })

  it('serializes tags as normalized csv', () => {
    expect(serializeSvnReleases(['10', '20', '30'])).toBe('10,20,30')
  })

  it('serializes with dedupe and invalid filtering', () => {
    expect(serializeSvnReleases(['10', '10', 'abc', ' 20 '])).toBe('10,20')
  })

  it('returns null when no valid tags remain', () => {
    expect(serializeSvnReleases([])).toBeNull()
    expect(serializeSvnReleases(['abc'])).toBeNull()
  })
})
