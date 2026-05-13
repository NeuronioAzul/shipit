import { describe, expect, it, vi } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import {
  APP_ID,
  APP_NAME,
  DEVELOPMENT_USER_DATA_DIR_NAME,
  PRODUCTION_USER_DATA_DIR_NAME,
  TEST_APP_ID,
  TEST_APP_NAME,
  SHIPIT_TEST_PROFILE_PREFIX,
  assertSafeShipItTestProfileDir,
  configureUserDataDir,
  createNativeImageWithFallback,
  getDevelopmentUserDataDir,
  getAppIdentity,
  getNotificationIconPath,
  getProductionUserDataDir,
  getPublicRootPath,
  getSoundsDir,
  getUpdateOverlayIconPath,
  getWindowIconPath,
  isSafeShipItTestProfileDir,
  prepareShipItTestProfileDir,
  type RuntimeNativeImage,
} from './runtime-paths.ts'

class FakeImage implements RuntimeNativeImage {
  constructor(
    readonly source: string,
    private readonly empty: boolean,
  ) {}

  isEmpty(): boolean {
    return this.empty
  }

  resize(size: { width: number; height: number }): RuntimeNativeImage {
    return new FakeImage(`${this.source}:${size.width}x${size.height}`, false)
  }
}

const repoRoot = path.resolve(__dirname, '..')

function createUserDataApp(isPackaged: boolean, appDataPath: string) {
  const setPath = vi.fn()
  return {
    app: {
      isPackaged,
      getPath: vi.fn((name: 'appData') => {
        if (name !== 'appData') throw new Error(`Unexpected path request: ${name}`)
        return appDataPath
      }),
      setPath,
    },
    setPath,
  }
}

describe('runtime path helpers', () => {
  it('resolves app identity for production and test mode', () => {
    expect(getAppIdentity({} as NodeJS.ProcessEnv)).toEqual({ appId: APP_ID, appName: APP_NAME })
    expect(getAppIdentity({ PLAYWRIGHT: '1' } as NodeJS.ProcessEnv)).toEqual({ appId: TEST_APP_ID, appName: TEST_APP_NAME })
  })

  it('keeps runtime app id aligned with electron-builder', () => {
    const packageJson = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf-8')) as {
      build: { appId: string }
    }

    expect(APP_ID).toBe(packageJson.build.appId)
  })

  it('configures packaged userData to the legacy production directory', () => {
    const appDataPath = path.join(os.tmpdir(), 'shipit-app-data')
    const { app, setPath } = createUserDataApp(true, appDataPath)
    const expectedPath = getProductionUserDataDir(appDataPath)

    expect(PRODUCTION_USER_DATA_DIR_NAME).toBe('shipit')
    expect(configureUserDataDir(app, {} as NodeJS.ProcessEnv)).toEqual({
      mode: 'production',
      path: expectedPath,
    })
    expect(setPath).toHaveBeenCalledWith('userData', expectedPath)
  })

  it('configures development userData separately from the production directory', () => {
    const appDataPath = path.join(os.tmpdir(), 'shipit-app-data')
    const { app, setPath } = createUserDataApp(false, appDataPath)
    const expectedPath = getDevelopmentUserDataDir(appDataPath)

    expect(DEVELOPMENT_USER_DATA_DIR_NAME).toBe('ShipIt!')
    expect(configureUserDataDir(app, {} as NodeJS.ProcessEnv)).toEqual({
      mode: 'development',
      path: expectedPath,
    })
    expect(setPath).toHaveBeenCalledWith('userData', expectedPath)
    expect(expectedPath).not.toBe(getProductionUserDataDir(appDataPath))
  })

  it('prioritizes the guarded E2E userData directory over packaged defaults', () => {
    const appDataPath = path.join(os.tmpdir(), 'shipit-app-data')
    const testDir = fs.mkdtempSync(path.join(os.tmpdir(), SHIPIT_TEST_PROFILE_PREFIX))
    const { app, setPath } = createUserDataApp(true, appDataPath)

    try {
      expect(configureUserDataDir(app, { SHIPIT_TEST_USER_DATA_DIR: testDir } as NodeJS.ProcessEnv)).toEqual({
        mode: 'test',
        path: path.resolve(testDir),
      })
      expect(setPath).toHaveBeenCalledWith('userData', path.resolve(testDir))
      expect(isSafeShipItTestProfileDir(testDir)).toBe(true)
    } finally {
      fs.rmSync(testDir, { recursive: true, force: true })
    }
  })

  it('resolves public asset paths for dev and packaged layouts', () => {
    const devContext = {
      isPackaged: false,
      appPath: repoRoot,
      resourcesPath: path.join(repoRoot, 'release', 'resources'),
    }
    const packagedContext = {
      isPackaged: true,
      appPath: path.join(repoRoot, 'resources', 'app.asar'),
      resourcesPath: path.join(repoRoot, 'resources'),
    }

    expect(getPublicRootPath(devContext)).toBe(path.join(repoRoot, 'public'))
    expect(getWindowIconPath(devContext)).toBe(path.join(repoRoot, 'public', 'assets', 'images', 'icons', 'ShipIt.ico'))
    expect(getNotificationIconPath(devContext)).toBe(getWindowIconPath(devContext))
    expect(getUpdateOverlayIconPath(devContext)).toBe(path.join(repoRoot, 'public', 'assets', 'images', 'icons', 'favicon-16x16.png'))
    expect(getPublicRootPath(packagedContext)).toBe(path.join(repoRoot, 'resources', 'app.asar', 'public'))
    expect(getSoundsDir(packagedContext)).toBe(path.join(repoRoot, 'resources', 'app.asar', 'public', 'assets', 'sounds'))
  })

  it('keeps the runtime Windows icon aligned with electron-builder', () => {
    const packageJson = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf-8')) as {
      build: { win: { icon: string } }
    }
    const runtimeIconPath = getWindowIconPath({
      isPackaged: false,
      appPath: repoRoot,
      resourcesPath: repoRoot,
    })
    const builderIconPath = path.join(repoRoot, packageJson.build.win.icon)

    expect(fs.existsSync(runtimeIconPath)).toBe(true)
    expect(fs.existsSync(builderIconPath)).toBe(true)
    expect(Buffer.compare(fs.readFileSync(runtimeIconPath), fs.readFileSync(builderIconPath))).toBe(0)
  })

  it('falls back when nativeImage cannot load the primary icon', () => {
    const factory = {
      createFromPath: vi.fn((filePath: string) => new FakeImage(filePath, filePath !== 'fallback.ico')),
      createEmpty: vi.fn(() => new FakeImage('empty', true)),
    }

    const image = createNativeImageWithFallback(factory, ['missing.ico', 'fallback.ico'], { width: 16, height: 16 })

    expect(factory.createFromPath).toHaveBeenCalledTimes(2)
    expect(factory.createEmpty).not.toHaveBeenCalled()
    expect(image.source).toBe('fallback.ico:16x16')
  })

  it('creates and validates guarded test profile markers', () => {
    const testDir = fs.mkdtempSync(path.join(os.tmpdir(), SHIPIT_TEST_PROFILE_PREFIX))
    const unsafeDir = fs.mkdtempSync(path.join(os.tmpdir(), SHIPIT_TEST_PROFILE_PREFIX))

    try {
      prepareShipItTestProfileDir(testDir)

      expect(isSafeShipItTestProfileDir(testDir)).toBe(true)
      expect(assertSafeShipItTestProfileDir(testDir)).toBe(path.resolve(testDir))
      expect(isSafeShipItTestProfileDir(unsafeDir)).toBe(false)
      expect(() => assertSafeShipItTestProfileDir(unsafeDir)).toThrow(/marcador|prefixo/)
      expect(() => prepareShipItTestProfileDir(path.join(os.tmpdir(), 'shipit-real-profile'))).toThrow(/shipit-e2e-/)
    } finally {
      fs.rmSync(testDir, { recursive: true, force: true })
      fs.rmSync(unsafeDir, { recursive: true, force: true })
    }
  })
})
