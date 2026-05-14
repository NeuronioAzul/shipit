import fs from 'fs'
import os from 'os'
import path from 'path'
import {
  assertSafeShipItTestProfileDir,
  getTestProfileMarkerPath,
  prepareShipItTestProfileDir,
  SHIPIT_TEST_PROFILE_MARKER,
  SHIPIT_TEST_PROFILE_PREFIX,
} from '../../electron/runtime-paths'

export function createShipItTestProfileDir(): string {
  const testDir = fs.mkdtempSync(path.join(os.tmpdir(), SHIPIT_TEST_PROFILE_PREFIX))
  return prepareShipItTestProfileDir(testDir)
}

export function createShipItTestProfileEnv(
  baseEnv: NodeJS.ProcessEnv,
  testDir: string,
): Record<string, string> {
  const env: Record<string, string> = {}

  for (const [key, value] of Object.entries(baseEnv)) {
    if (typeof value === 'string') {
      env[key] = value
    }
  }

  return {
    ...env,
    NODE_ENV: 'test',
    PLAYWRIGHT: '1',
    SHIPIT_TEST_USER_DATA_DIR: testDir,
    SHIPIT_E2E_FAKE_UPDATER: '1',
  }
}

export function removeShipItTestProfileDir(testDir: string): void {
  const safeDir = assertSafeShipItTestProfileDir(testDir)
  const removeOptions = {
    recursive: true,
    force: true,
    maxRetries: 5,
    retryDelay: 100,
  }

  for (const entry of fs.readdirSync(safeDir, { withFileTypes: true })) {
    if (entry.name === SHIPIT_TEST_PROFILE_MARKER) continue
    fs.rmSync(path.join(safeDir, entry.name), removeOptions)
  }

  fs.rmSync(getTestProfileMarkerPath(safeDir), { force: true, maxRetries: 5, retryDelay: 100 })
  fs.rmdirSync(safeDir)
}

export async function removeShipItTestProfileDirWithRetries(testDir: string): Promise<void> {
  let lastError: unknown

  for (let attempt = 1; attempt <= 10; attempt++) {
    try {
      removeShipItTestProfileDir(testDir)
      return
    } catch (error) {
      lastError = error
      await new Promise(resolve => setTimeout(resolve, 150))
    }
  }

  throw lastError
}
