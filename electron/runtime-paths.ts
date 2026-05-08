import fs from 'fs'
import path from 'path'

export const APP_ID = 'br.com.neuronioazul.shipit'
export const APP_NAME = 'ShipIt!'
export const PRODUCTION_USER_DATA_DIR_NAME = 'shipit'
export const DEVELOPMENT_USER_DATA_DIR_NAME = 'ShipIt!'
export const TEST_APP_ID = `${APP_ID}.test`
export const TEST_APP_NAME = `${APP_NAME} Test`
export const SHIPIT_TEST_PROFILE_MARKER = '.shipit-test-profile'
export const SHIPIT_TEST_PROFILE_PREFIX = 'shipit-e2e-'

export interface RuntimePathContext {
  isPackaged: boolean
  appPath: string
  resourcesPath: string
}

export interface RuntimePathAppLike {
  isPackaged: boolean
  getAppPath: () => string
}

export interface TestUserDataAppLike {
  setPath: (name: string, value: string) => void
}

export interface UserDataDirAppLike {
  isPackaged: boolean
  getPath: (name: 'appData') => string
  setPath: (name: 'userData', value: string) => void
}

export type UserDataDirMode = 'test' | 'production' | 'development'

export interface UserDataDirResolution {
  mode: UserDataDirMode
  path: string
}

export interface RuntimeNativeImage {
  isEmpty: () => boolean
  resize: (size: { width: number; height: number }) => RuntimeNativeImage
}

export interface RuntimeNativeImageFactory<TImage extends RuntimeNativeImage> {
  createFromPath: (filePath: string) => TImage
  createEmpty: () => TImage
}

interface TestProfileFs {
  existsSync: (targetPath: string) => boolean
  mkdirSync: (targetPath: string, options: { recursive: boolean }) => unknown
  writeFileSync: (targetPath: string, data: string, encoding: BufferEncoding) => void
}

function getProcessResourcesPath(): string {
  const processWithResources = process as typeof process & { resourcesPath?: string }
  return processWithResources.resourcesPath || process.cwd()
}

export function isShipItTestMode(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.PLAYWRIGHT === '1' || env.NODE_ENV === 'test' || Boolean(env.SHIPIT_TEST_USER_DATA_DIR)
}

export function getAppIdentity(env: NodeJS.ProcessEnv = process.env): { appId: string; appName: string } {
  if (isShipItTestMode(env)) {
    return { appId: TEST_APP_ID, appName: TEST_APP_NAME }
  }

  return { appId: APP_ID, appName: APP_NAME }
}

export function getProductionUserDataDir(appDataPath: string): string {
  return path.join(appDataPath, PRODUCTION_USER_DATA_DIR_NAME)
}

export function getDevelopmentUserDataDir(appDataPath: string): string {
  return path.join(appDataPath, DEVELOPMENT_USER_DATA_DIR_NAME)
}

export function resolveUserDataDir(
  app: Pick<UserDataDirAppLike, 'isPackaged' | 'getPath'>,
  env: NodeJS.ProcessEnv = process.env,
): UserDataDirResolution {
  if (env.SHIPIT_TEST_USER_DATA_DIR) {
    return { mode: 'test', path: path.resolve(env.SHIPIT_TEST_USER_DATA_DIR) }
  }

  const appDataPath = app.getPath('appData')
  if (app.isPackaged) {
    return { mode: 'production', path: getProductionUserDataDir(appDataPath) }
  }

  return { mode: 'development', path: getDevelopmentUserDataDir(appDataPath) }
}

export function configureUserDataDir(
  app: UserDataDirAppLike,
  env: NodeJS.ProcessEnv = process.env,
): UserDataDirResolution {
  const resolution = resolveUserDataDir(app, env)
  const userDataPath = resolution.mode === 'test'
    ? prepareShipItTestProfileDir(resolution.path)
    : resolution.path

  app.setPath('userData', userDataPath)
  return { ...resolution, path: userDataPath }
}

export function getRuntimePathContext(
  app: RuntimePathAppLike,
  resourcesPath = getProcessResourcesPath(),
): RuntimePathContext {
  return {
    isPackaged: app.isPackaged,
    appPath: app.getAppPath(),
    resourcesPath,
  }
}

export function getPublicRootPath(context: RuntimePathContext): string {
  if (context.isPackaged) {
    return path.join(context.resourcesPath, 'app.asar', 'public')
  }

  return path.join(context.appPath, 'public')
}

export function getPublicAssetPath(context: RuntimePathContext, ...segments: string[]): string {
  return path.join(getPublicRootPath(context), ...segments)
}

export function getWindowIconPath(context: RuntimePathContext): string {
  return getPublicAssetPath(context, 'assets', 'images', 'icons', 'ShipIt.ico')
}

export function getNotificationIconPath(context: RuntimePathContext): string {
  return getPublicAssetPath(context, 'assets', 'images', 'icons', 'ShipIt.ico')
}

export function getNotificationFallbackIconPath(context: RuntimePathContext): string {
  return getPublicAssetPath(context, 'assets', 'images', 'icons', 'favicon-96x96.png')
}

export function getTrayIconPath(context: RuntimePathContext, filename: string): string {
  return getPublicAssetPath(context, 'assets', 'images', 'tray', filename)
}

export function getSoundsDir(context: RuntimePathContext): string {
  return getPublicAssetPath(context, 'assets', 'sounds')
}

export function createNativeImageWithFallback<TImage extends RuntimeNativeImage>(
  factory: RuntimeNativeImageFactory<TImage>,
  candidates: string[],
  resizeTo?: { width: number; height: number },
): TImage {
  for (const candidate of candidates) {
    const image = factory.createFromPath(candidate)
    if (!image.isEmpty()) {
      return resizeTo ? image.resize(resizeTo) as TImage : image
    }
  }

  return factory.createEmpty()
}

export function getTestProfileMarkerPath(targetDir: string): string {
  return path.join(targetDir, SHIPIT_TEST_PROFILE_MARKER)
}

export function prepareShipItTestProfileDir(
  targetDir: string,
  fsLike: TestProfileFs = fs,
): string {
  const resolvedDir = path.resolve(targetDir)
  if (!path.basename(resolvedDir).startsWith(SHIPIT_TEST_PROFILE_PREFIX)) {
    throw new Error(`Diretório de teste recusado: o nome deve iniciar com ${SHIPIT_TEST_PROFILE_PREFIX}`)
  }

  fsLike.mkdirSync(resolvedDir, { recursive: true })
  fsLike.writeFileSync(
    getTestProfileMarkerPath(resolvedDir),
    'ShipIt perfil de teste. Seguro para excluir apenas via limpeza de teste protegida.\n',
    'utf-8',
  )
  return resolvedDir
}

export function isSafeShipItTestProfileDir(targetDir: string, fsLike: Pick<TestProfileFs, 'existsSync'> = fs): boolean {
  const resolvedDir = path.resolve(targetDir)
  return path.basename(resolvedDir).startsWith(SHIPIT_TEST_PROFILE_PREFIX) &&
    fsLike.existsSync(getTestProfileMarkerPath(resolvedDir))
}

export function assertSafeShipItTestProfileDir(targetDir: string, fsLike: Pick<TestProfileFs, 'existsSync'> = fs): string {
  const resolvedDir = path.resolve(targetDir)
  if (!isSafeShipItTestProfileDir(resolvedDir, fsLike)) {
    throw new Error('Limpeza recusada: perfil de teste sem marcador de segurança ou prefixo esperado.')
  }

  return resolvedDir
}

export function configureTestUserDataDir(
  app: TestUserDataAppLike,
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  if (!env.SHIPIT_TEST_USER_DATA_DIR) {
    return null
  }

  const testDir = prepareShipItTestProfileDir(env.SHIPIT_TEST_USER_DATA_DIR)
  app.setPath('userData', testDir)
  return testDir
}
