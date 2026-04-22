import { beforeEach, describe, expect, it } from 'vitest'
import {
  __resetSaveContextRegistryForTests,
  registerSaveContextHandler,
  runSaveContext,
} from './saveContextRegistry'

describe('saveContextRegistry', () => {
  beforeEach(() => {
    __resetSaveContextRegistryForTests()
  })

  it('returns unavailable when no handler is registered', async () => {
    const result = await runSaveContext()
    expect(result.status).toBe('unavailable')
  })

  it('executes the active handler', async () => {
    registerSaveContextHandler(() => ({ status: 'saved', message: 'ok' }))

    const result = await runSaveContext()
    expect(result).toEqual({ status: 'saved', message: 'ok' })
  })

  it('uses the most recently registered handler and restores previous on unregister', async () => {
    const unregisterA = registerSaveContextHandler(() => ({ status: 'saved', message: 'A' }))
    const unregisterB = registerSaveContextHandler(() => ({ status: 'saved', message: 'B' }))

    await expect(runSaveContext()).resolves.toEqual({ status: 'saved', message: 'B' })

    unregisterB()
    await expect(runSaveContext()).resolves.toEqual({ status: 'saved', message: 'A' })

    unregisterA()
    await expect(runSaveContext()).resolves.toMatchObject({ status: 'unavailable' })
  })

  it('returns error status when handler throws', async () => {
    registerSaveContextHandler(() => {
      throw new Error('boom')
    })

    const result = await runSaveContext()
    expect(result.status).toBe('error')
  })
})
