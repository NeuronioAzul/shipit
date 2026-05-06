import { describe, expect, it, vi } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import {
  APP_ID,
  APP_NAME,
  TEST_APP_ID,
  TEST_APP_NAME,
  SHIPIT_TEST_PROFILE_PREFIX,
  assertSafeShipItTestProfileDir,
  createNativeImageWithFallback,
  getAppIdentity,
  getNotificationIconPath,
  getPublicRootPath,
  getSoundsDir,
  getWindowIconPath,
  isSafeShipItTestProfileDir,
  prepareShipItTestProfileDir,
  type RuntimeNativeImage,
} from './runtime-paths'

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

describe('runtime path helpers', () => {
  it('resolves app identity for production and test mode', () => {
    expect(getAppIdentity({} as NodeJS.ProcessEnv)).toEqual({ appId: APP_ID, appName: APP_NAME })
    expect(getAppIdentity({ PLAYWRIGHT: '1' } as NodeJS.ProcessEnv)).toEqual({ appId: TEST_APP_ID, appName: TEST_APP_NAME })
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
