import { describe, expect, it } from 'vitest'
import {
  getAllReleases,
  isDeployedTo,
  migrateLegacyDeployments,
  parseDeployments,
  serializeDeployments,
} from './deployments'

describe('parseDeployments', () => {
  it('returns an empty list for null, empty, invalid JSON or non-object JSON', () => {
    expect(parseDeployments(null)).toEqual([])
    expect(parseDeployments(undefined)).toEqual([])
    expect(parseDeployments('')).toEqual([])
    expect(parseDeployments('{not json')).toEqual([])
    expect(parseDeployments('[1,2]')).toEqual([])
    expect(parseDeployments('"texto"')).toEqual([])
  })

  it('parses a valid object into the canonical environment order', () => {
    const list = parseDeployments('{"Produção":["3"],"Desenvolvimento":["1","2"],"Homologação":[]}')
    expect(list).toEqual([
      { environment: 'Desenvolvimento', releases: ['1', '2'] },
      { environment: 'Homologação', releases: [] },
      { environment: 'Produção', releases: ['3'] },
    ])
  })

  it('keeps an empty array as "marked without releases"', () => {
    expect(parseDeployments('{"Homologação":[]}')).toEqual([
      { environment: 'Homologação', releases: [] },
    ])
  })

  it('ignores unknown keys and invalid release values', () => {
    const list = parseDeployments('{"Staging":["9"],"Produção":["12", "abc", 34, "12", null, " 56 "]}')
    expect(list).toEqual([{ environment: 'Produção', releases: ['12', '34', '56'] }])
  })

  it('treats a non-array release value as an empty list', () => {
    expect(parseDeployments('{"Desenvolvimento":"123"}')).toEqual([
      { environment: 'Desenvolvimento', releases: [] },
    ])
  })
})

describe('serializeDeployments', () => {
  it('returns null when nothing is marked', () => {
    expect(serializeDeployments([])).toBeNull()
  })

  it('serializes in canonical order, normalizing and deduplicating releases', () => {
    const json = serializeDeployments([
      { environment: 'Produção', releases: ['20', '20'] },
      { environment: 'Desenvolvimento', releases: [' 10 ', 'x', '11'] },
    ])
    expect(json).toBe('{"Desenvolvimento":["10","11"],"Produção":["20"]}')
  })

  it('keeps marked environments with no releases', () => {
    expect(serializeDeployments([{ environment: 'Homologação', releases: [] }]))
      .toBe('{"Homologação":[]}')
  })

  it('lets the last entry win for duplicated environments', () => {
    const json = serializeDeployments([
      { environment: 'Homologação', releases: ['1'] },
      { environment: 'Homologação', releases: ['2'] },
    ])
    expect(json).toBe('{"Homologação":["2"]}')
  })

  it('round-trips through parse', () => {
    const original = [
      { environment: 'Desenvolvimento' as const, releases: ['1', '2'] },
      { environment: 'Produção' as const, releases: [] },
    ]
    expect(parseDeployments(serializeDeployments(original))).toEqual(original)
  })
})

describe('helpers', () => {
  const list = parseDeployments('{"Desenvolvimento":["1","2"],"Homologação":["2","3"]}')

  it('isDeployedTo checks the presence of the environment', () => {
    expect(isDeployedTo(list, 'Desenvolvimento')).toBe(true)
    expect(isDeployedTo(list, 'Produção')).toBe(false)
  })

  it('getAllReleases flattens in environment order without repetition', () => {
    expect(getAllReleases(list)).toEqual(['1', '2', '3'])
  })
})

describe('migrateLegacyDeployments', () => {
  it('migrates an environment without releases as marked with an empty list', () => {
    expect(migrateLegacyDeployments('Produção', null)).toBe('{"Produção":[]}')
  })

  it('migrates an environment with its csv releases', () => {
    expect(migrateLegacyDeployments('Homologação', '12345, 12346,abc,12345'))
      .toBe('{"Homologação":["12345","12346"]}')
  })

  it('discards releases without an environment', () => {
    expect(migrateLegacyDeployments(null, '12345')).toBeNull()
    expect(migrateLegacyDeployments(undefined, '12345')).toBeNull()
  })

  it('discards unknown environments', () => {
    expect(migrateLegacyDeployments('Staging' as never, '12345')).toBeNull()
  })
})
