import 'reflect-metadata'
import { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, dialog, protocol, net, Notification, shell, clipboard, type MenuItemConstructorOptions, type WebContents } from 'electron'
import { autoUpdater } from 'electron-updater'
import path from 'path'
import fs from 'fs'
import {
  configureUserDataDir,
  createNativeImageWithFallback,
  getAppIdentity,
  getNotificationFallbackIconPath,
  getNotificationIconPath,
  getRuntimePathContext,
  getSoundsDir as resolveSoundsDir,
  getTrayIconPath,
  getUpdateOverlayIconPath,
  getWindowIconPath,
} from './runtime-paths'
import { createUpdateService, type UpdateService, type UpdateStatusData } from './update-notifications'
import { createFakeAutoUpdater, type FakeAutoUpdaterControl } from './test-fake-updater'

configureUserDataDir(app)

const appIdentity = getAppIdentity()
app.setName(appIdentity.appName)

if (process.platform === 'win32') {
  app.setAppUserModelId(appIdentity.appId)
}

const hasSingleInstanceLock = app.requestSingleInstanceLock()
if (!hasSingleInstanceLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    focusMainWindow()
  })
}

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let updateService: UpdateService | null = null
let fakeUpdater: FakeAutoUpdaterControl | null = null
const isE2EFakeUpdaterEnabled = process.env.SHIPIT_E2E_FAKE_UPDATER === '1'
let alertIntervalId: ReturnType<typeof setInterval> | null = null
let trayIntervalId: ReturnType<typeof setInterval> | null = null
const isDev = !app.isPackaged

protocol.registerSchemesAsPrivileged([
  { scheme: 'shipit-evidence', privileges: { supportFetchAPI: true, stream: true } },
  { scheme: 'shipit-sfx', privileges: { supportFetchAPI: true, stream: true } },
])

const ALLOWED_EXTERNAL_PROTOCOLS = new Set(['http:', 'https:', 'mailto:'])
const INTERNAL_UPDATE_SETTINGS_KEY = '__internalUpdate'

interface PersistedUpdateState {
  latestKnownVersion?: string
  downloadedVersion?: string
  acknowledgedVersion?: string
  lastAttentionViewedAt?: string
}

let currentUpdateState: UpdateStatusData = { status: 'not-available', attentionVisible: false }

function parseUrlSafe(rawUrl: string): URL | null {
  try {
    return new URL(rawUrl)
  } catch {
    return null
  }
}

function normalizeFilePathname(fileUrl: URL): string {
  const decoded = decodeURIComponent(fileUrl.pathname)
  const withDriveLetter = decoded.replace(/^\/([A-Za-z]:)/, '$1')
  return path.normalize(withDriveLetter).toLowerCase()
}

function isInternalAppNavigation(targetUrl: string, currentUrl: string): boolean {
  if (targetUrl === currentUrl) return true

  const target = parseUrlSafe(targetUrl)
  const current = parseUrlSafe(currentUrl)
  if (!target || !current) return false

  if (target.protocol === 'file:' && current.protocol === 'file:') {
    return normalizeFilePathname(target) === normalizeFilePathname(current)
  }

  if (isDev && (target.protocol === 'http:' || target.protocol === 'https:')) {
    return target.origin === current.origin
  }

  return false
}

async function openExternalSafely(rawUrl: string): Promise<void> {
  const parsed = parseUrlSafe(rawUrl)
  if (!parsed) return
  if (!ALLOWED_EXTERNAL_PROTOCOLS.has(parsed.protocol)) return

  try {
    await shell.openExternal(parsed.toString())
  } catch (error) {
    console.error('Failed to open external URL:', parsed.toString(), error)
  }
}

function getRuntimePaths() {
  return getRuntimePathContext(app)
}

function createWindowIcon() {
  const paths = getRuntimePaths()
  return createNativeImageWithFallback(nativeImage, [
    getWindowIconPath(paths),
    getNotificationFallbackIconPath(paths),
  ])
}

function createNotificationIcon() {
  const paths = getRuntimePaths()
  return createNativeImageWithFallback(nativeImage, [
    getNotificationIconPath(paths),
    getNotificationFallbackIconPath(paths),
  ])
}

function getNotificationIconFilePath(): string | undefined {
  const paths = getRuntimePaths()
  const candidates = [
    getNotificationIconPath(paths),
    getNotificationFallbackIconPath(paths),
  ]

  for (const candidate of candidates) {
    if (!nativeImage.createFromPath(candidate).isEmpty()) {
      return candidate
    }
  }

  return candidates[candidates.length - 1]
}

function createUpdateOverlayIcon() {
  const paths = getRuntimePaths()
  return createNativeImageWithFallback(nativeImage, [
    getUpdateOverlayIconPath(paths),
    getNotificationFallbackIconPath(paths),
  ], { width: 16, height: 16 })
}

function normalizeStoredVersion(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined

  const normalized = value.trim()
  return normalized.length > 0 ? normalized : undefined
}

function compareVersions(left: string, right: string): number {
  const leftParts = left.replace(/^v/i, '').split(/[.-]/)
  const rightParts = right.replace(/^v/i, '').split(/[.-]/)
  const length = Math.max(leftParts.length, rightParts.length)

  for (let index = 0; index < length; index += 1) {
    const leftPart = leftParts[index] ?? '0'
    const rightPart = rightParts[index] ?? '0'
    const leftNumber = Number(leftPart)
    const rightNumber = Number(rightPart)
    const leftIsNumber = Number.isFinite(leftNumber) && leftPart.trim() !== ''
    const rightIsNumber = Number.isFinite(rightNumber) && rightPart.trim() !== ''

    if (leftIsNumber && rightIsNumber) {
      if (leftNumber !== rightNumber) {
        return leftNumber - rightNumber
      }
      continue
    }

    const comparison = leftPart.localeCompare(rightPart)
    if (comparison !== 0) {
      return comparison
    }
  }

  return 0
}

function isInstalledVersionAtLeast(version?: string): boolean {
  if (!version) return false
  return compareVersions(app.getVersion(), version) >= 0
}

function normalizePersistedUpdateState(state: PersistedUpdateState): PersistedUpdateState {
  const latestKnownVersion = normalizeStoredVersion(state.latestKnownVersion)
  const downloadedVersion = normalizeStoredVersion(state.downloadedVersion)
  const acknowledgedVersion = normalizeStoredVersion(state.acknowledgedVersion)
  const lastAttentionViewedAt = typeof state.lastAttentionViewedAt === 'string' && state.lastAttentionViewedAt.trim().length > 0
    ? state.lastAttentionViewedAt
    : undefined

  const normalized: PersistedUpdateState = {}

  if (latestKnownVersion && !isInstalledVersionAtLeast(latestKnownVersion)) {
    normalized.latestKnownVersion = latestKnownVersion
  }

  if (downloadedVersion && !isInstalledVersionAtLeast(downloadedVersion)) {
    normalized.downloadedVersion = downloadedVersion
  }

  const pendingVersion = normalized.downloadedVersion ?? normalized.latestKnownVersion
  if (acknowledgedVersion && pendingVersion) {
    normalized.acknowledgedVersion = acknowledgedVersion
  }

  if (lastAttentionViewedAt && normalized.acknowledgedVersion) {
    normalized.lastAttentionViewedAt = lastAttentionViewedAt
  }

  return normalized
}

function getPublicSettings(settingsData: Record<string, unknown>): Record<string, unknown> {
  const publicSettings = { ...settingsData }
  delete publicSettings[INTERNAL_UPDATE_SETTINGS_KEY]
  return publicSettings
}

function readPersistedUpdateState(settingsData: Record<string, unknown> = loadSettings()): PersistedUpdateState {
  const rawValue = settingsData[INTERNAL_UPDATE_SETTINGS_KEY]
  if (!rawValue || typeof rawValue !== 'object' || Array.isArray(rawValue)) {
    return {}
  }

  return normalizePersistedUpdateState(rawValue as PersistedUpdateState)
}

function savePersistedUpdateState(state: PersistedUpdateState): PersistedUpdateState {
  const currentSettings = loadSettings()
  const nextSettings = { ...currentSettings }
  const normalized = normalizePersistedUpdateState(state)

  if (Object.keys(normalized).length > 0) {
    nextSettings[INTERNAL_UPDATE_SETTINGS_KEY] = normalized
  } else {
    delete nextSettings[INTERNAL_UPDATE_SETTINGS_KEY]
  }

  saveSettingsFile(nextSettings)
  return normalized
}

function buildInitialUpdateState(persistedState: PersistedUpdateState): UpdateStatusData {
  if (!app.isPackaged && !isE2EFakeUpdaterEnabled) {
    return { status: 'dev', attentionVisible: false }
  }

  // `downloadedVersion` foi salvo numa sessão anterior. Ao reiniciar,
  // electron-updater perde o caminho do arquivo em memória — quitAndInstall()
  // falharia com "No update filepath provided". Degrada para `available` para
  // o usuário re-baixar e então instalar com segurança.
  if (persistedState.downloadedVersion) {
    return {
      status: 'available',
      version: persistedState.downloadedVersion,
      attentionVisible: persistedState.downloadedVersion !== persistedState.acknowledgedVersion,
    }
  }

  if (persistedState.latestKnownVersion) {
    return {
      status: 'available',
      version: persistedState.latestKnownVersion,
      attentionVisible: persistedState.latestKnownVersion !== persistedState.acknowledgedVersion,
    }
  }

  return { status: 'not-available', attentionVisible: false }
}

function persistUpdateSnapshot(snapshot: UpdateStatusData): PersistedUpdateState {
  const currentPersistedState = readPersistedUpdateState()
  const nextPersistedState: PersistedUpdateState = { ...currentPersistedState }

  switch (snapshot.status) {
    case 'available':
    case 'downloading':
      if (snapshot.version) {
        nextPersistedState.latestKnownVersion = snapshot.version
        if (nextPersistedState.downloadedVersion && nextPersistedState.downloadedVersion !== snapshot.version) {
          nextPersistedState.downloadedVersion = undefined
        }
      }
      break
    case 'downloaded':
      if (snapshot.version) {
        nextPersistedState.latestKnownVersion = snapshot.version
        nextPersistedState.downloadedVersion = snapshot.version
      }
      break
    case 'not-available':
      nextPersistedState.latestKnownVersion = undefined
      nextPersistedState.downloadedVersion = undefined
      break
    default:
      break
  }

  return savePersistedUpdateState(nextPersistedState)
}

function applyUpdateAttentionIndicator(snapshot: UpdateStatusData): void {
  if (process.platform === 'win32') {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setOverlayIcon(
        snapshot.attentionVisible ? createUpdateOverlayIcon() : null,
        snapshot.attentionVisible ? 'Nova versão disponível do ShipIt!' : '',
      )
    }
    return
  }

  if (process.platform === 'darwin' || process.platform === 'linux') {
    app.setBadgeCount(snapshot.attentionVisible ? 1 : 0)
  }
}

function broadcastUpdateState(snapshot: UpdateStatusData, options: { persist?: boolean } = {}): UpdateStatusData {
  currentUpdateState = snapshot

  if (options.persist !== false) {
    persistUpdateSnapshot(snapshot)
  }

  applyUpdateAttentionIndicator(snapshot)
  mainWindow?.webContents.send('app:updateStatus', snapshot)
  return snapshot
}

function createTrayIconImage(status: 'default' | 'green' | 'yellow' | 'red' = 'default') {
  const statusMap: Record<string, string> = {
    default: 'tray-icon-foguete-black.png',
    green: 'tray-icon-foguete-green.png',
    yellow: 'tray-icon-foguete-yellow.png',
    red: 'tray-icon-foguete-red.png',
  }
  const iconFile = statusMap[status] || statusMap['default']
  const paths = getRuntimePaths()

  return createNativeImageWithFallback(nativeImage, [
    getTrayIconPath(paths, iconFile),
    getNotificationFallbackIconPath(paths),
    getWindowIconPath(paths),
  ], { width: 16, height: 16 })
}

function focusMainWindow(route?: string): void {
  if (!mainWindow || mainWindow.isDestroyed()) return

  if (mainWindow.isMinimized()) {
    mainWindow.restore()
  }

  if (!mainWindow.isVisible()) {
    mainWindow.show()
  }

  mainWindow.focus()

  if (route) {
    mainWindow.webContents.send('app:navigate', route)
  }
}

function focusUpdateSettings(): void {
  focusMainWindow('/settings?focus=update')
}

function getEffectiveAutoUpdater() {
  if (isE2EFakeUpdaterEnabled) {
    if (!fakeUpdater) {
      fakeUpdater = createFakeAutoUpdater()
      ;(globalThis as typeof globalThis & { __shipitFakeUpdater?: FakeAutoUpdaterControl }).__shipitFakeUpdater = fakeUpdater
    }
    return fakeUpdater
  }
  return autoUpdater
}

function getUpdateService(): UpdateService {
  if (!updateService) {
    const persistedState = readPersistedUpdateState()
    currentUpdateState = buildInitialUpdateState(persistedState)

    updateService = createUpdateService({
      autoUpdater: getEffectiveAutoUpdater(),
      isPackaged: () => isE2EFakeUpdaterEnabled || app.isPackaged,
      sendStatus: (data) => { broadcastUpdateState(data) },
      Notification,
      getNotificationIcon: getNotificationIconFilePath,
      focusSettings: focusUpdateSettings,
      getCurrentVersion: () => app.getVersion(),
      initialState: currentUpdateState,
      acknowledgedVersion: persistedState.acknowledgedVersion,
      supportsNotificationActions: process.platform !== 'linux',
    })
  }

  return updateService
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 800,
    minHeight: 600,
    show: false,
    icon: createWindowIcon(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    frame: false,
    titleBarStyle: 'hidden',
    title: 'ShipIt!',
    backgroundColor: '#1e1e1e',
  })

  if (isDev && !process.env.PLAYWRIGHT) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
    applyUpdateAttentionIndicator(currentUpdateState)
  })

  mainWindow.on('close', (event) => {
    if (tray) {
      event.preventDefault()
      mainWindow?.hide()
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  const { webContents } = mainWindow

  webContents.setWindowOpenHandler(({ url }) => {
    void openExternalSafely(url)
    return { action: 'deny' }
  })

  webContents.on('will-navigate', (event, url) => {
    const currentUrl = webContents.getURL()
    if (isInternalAppNavigation(url, currentUrl)) {
      return
    }

    event.preventDefault()
    void openExternalSafely(url)
  })

  webContents.on('context-menu', (_event, params) => {
    const template: MenuItemConstructorOptions[] = []
    const { editFlags, isEditable, selectionText } = params
    let hasEnabledAction = false

    const pushAction = (item: MenuItemConstructorOptions) => {
      template.push(item)
      if (item.type !== 'separator' && item.enabled !== false) {
        hasEnabledAction = true
      }
    }

    if (isEditable) {
      pushAction({ role: 'undo', enabled: editFlags.canUndo })
      pushAction({ role: 'redo', enabled: editFlags.canRedo })
      template.push({ type: 'separator' })
      pushAction({ role: 'cut', enabled: editFlags.canCut })
      pushAction({ role: 'copy', enabled: editFlags.canCopy })
      pushAction({ role: 'paste', enabled: editFlags.canPaste })
      template.push({ type: 'separator' })
      pushAction({ role: 'selectAll', enabled: editFlags.canSelectAll })
    } else if (selectionText.trim().length > 0) {
      pushAction({ role: 'copy', enabled: editFlags.canCopy })
    }

    if (!hasEnabledAction) {
      return
    }

    const contextMenu = Menu.buildFromTemplate(template)
    contextMenu.popup({ window: mainWindow ?? undefined })
  })

  // Notify renderer of maximize/unmaximize changes
  webContents.on('did-finish-load', () => {
    mainWindow?.webContents.send('app:updateStatus', currentUpdateState)
    applyUpdateAttentionIndicator(currentUpdateState)
  })

  mainWindow.on('maximize', () => {
    mainWindow?.webContents.send('window:maximized-change', true)
  })
  mainWindow.on('unmaximize', () => {
    mainWindow?.webContents.send('window:maximized-change', false)
  })
}

function createTray() {
  tray = new Tray(createTrayIconImage())

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Abrir ShipIt!',
      click: () => {
        focusMainWindow()
      },
    },
    { type: 'separator' },
    {
      label: 'Nova Atividade',
      click: () => {
        focusMainWindow('/activities/new')
      },
    },
    {
      label: 'Dashboard',
      click: () => {
        focusMainWindow('/')
      },
    },
    {
      label: 'Atividades',
      click: () => {
        focusMainWindow('/activities')
      },
    },
    {
      label: 'Perfil',
      click: () => {
        focusMainWindow('/profile')
      },
    },
    {
      label: 'Configurações',
      click: () => {
        focusMainWindow('/settings')
      },
    },
    { type: 'separator' },
    {
      label: 'Sair',
      click: () => {
        tray?.destroy()
        tray = null
        app.quit()
      },
    },
  ])

  tray.setToolTip('ShipIt! - Relatório Mensal')
  tray.setContextMenu(contextMenu)

  tray.on('click', () => {
    focusMainWindow()
  })
}

app.whenReady().then(async () => {
  if (!hasSingleInstanceLock) return

  // Initialize database early to ensure TypeORM metadata is registered
  const { initDatabase, cleanupTrash } = await import('./database')
  await initDatabase()
  
  // Cleanup old trash items on startup
  await cleanupTrash()

  // Register custom protocol to serve evidence images securely
  protocol.handle('shipit-evidence', (request) => {
    const url = new URL(request.url)
    const filePath = url.searchParams.get('path')
    if (!filePath) {
      return new Response('Missing path', { status: 400 })
    }
    // Security: only allow files inside evidences or trash directories
    const evidencesDir = path.join(app.getPath('userData'), 'evidences')
    const trashDir = path.join(app.getPath('userData'), 'trash')
    const resolved = path.resolve(filePath)
    if (!resolved.startsWith(evidencesDir) && !resolved.startsWith(trashDir)) {
      return new Response('Forbidden', { status: 403 })
    }
    if (!fs.existsSync(resolved)) {
      return new Response('Not found', { status: 404 })
    }
    const { pathToFileURL } = require('url') as typeof import('url')
    return net.fetch(pathToFileURL(resolved).href)
  })

  // Register custom protocol to serve sound files
  protocol.handle('shipit-sfx', (request) => {
    const url = new URL(request.url)
    const filename = url.searchParams.get('file')
    if (!filename) {
      return new Response('Missing file', { status: 400 })
    }
    const safe = path.basename(filename)
    const soundsDir = getSoundsDir()
    const filePath = path.join(soundsDir, safe)
    const resolved = path.resolve(filePath)
    if (!resolved.startsWith(path.resolve(soundsDir))) {
      return new Response('Forbidden', { status: 403 })
    }
    if (!fs.existsSync(resolved)) {
      return new Response('Not found', { status: 404 })
    }
    const { pathToFileURL } = require('url') as typeof import('url')
    return net.fetch(pathToFileURL(resolved).href)
  })

  createWindow()
  createTray()
  startSchedulers()

  // Auto-update: check for updates only in packaged builds (or under the
  // E2E fake updater).
  if (app.isPackaged || isE2EFakeUpdaterEnabled) {
    const updater = getEffectiveAutoUpdater()
    updater.autoDownload = false
    updater.autoInstallOnAppQuit = false

    const service = getUpdateService()
    service.registerAutoUpdaterHandlers()
    applyUpdateAttentionIndicator(service.getCurrentState())
    if (!isE2EFakeUpdaterEnabled) {
      void service.checkForUpdates()
    } else {
      ;(globalThis as typeof globalThis & { __shipitResetUpdateService?: () => void }).__shipitResetUpdateService = () => {
        service.resetForTests()
      }
      ;(globalThis as typeof globalThis & {
        __shipitSimulateRestart?: () => UpdateStatusData
      }).__shipitSimulateRestart = () => {
        // Simulates an app restart for E2E: drops the cached service so the
        // next access re-reads persisted state via buildInitialUpdateState.
        updateService = null
        const next = getUpdateService()
        broadcastUpdateState(next.getCurrentState(), { persist: false })
        return next.getCurrentState()
      }
    }
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    stopSchedulers()
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  } else {
    focusMainWindow()
  }
})

// IPC handlers for database operations
ipcMain.handle('db:getUserProfile', async () => {
  const { getUserProfile } = await import('./database')
  return getUserProfile()
})

ipcMain.handle('db:saveUserProfile', async (_event, profileData) => {
  const { saveUserProfile } = await import('./database')
  return saveUserProfile(profileData)
})

ipcMain.handle('app:getVersion', () => {
  return app.getVersion()
})

// ──── Activity IPC ────

ipcMain.handle('db:getActivities', async (_event, monthReference: string) => {
  const { getActivities } = await import('./database')
  return getActivities(monthReference)
})

ipcMain.handle('db:searchActivities', async (_event, query: string) => {
  const { searchActivities } = await import('./database')
  return searchActivities(query)
})

ipcMain.handle('db:getActivity', async (_event, id: string) => {
  const { getActivity } = await import('./database')
  return getActivity(id)
})

ipcMain.handle('db:saveActivity', async (_event, data) => {
  const { saveActivity } = await import('./database')
  return saveActivity(data)
})

ipcMain.handle('db:deleteActivity', async (_event, id: string) => {
  const { deleteActivity } = await import('./database')
  return deleteActivity(id)
})

ipcMain.handle('db:reorderActivities', async (_event, items) => {
  const { reorderActivities } = await import('./database')
  return reorderActivities(items)
})

// ──── Evidence IPC ────

ipcMain.handle('db:saveEvidence', async (_event, activityId: string, sourcePath: string, caption: string | null) => {
  const { saveEvidence } = await import('./database')
  return saveEvidence(activityId, sourcePath, caption)
})

ipcMain.handle('db:saveEvidenceFromBuffer', async (_event, activityId: string, bufferData: ArrayBuffer, extension: string, caption: string | null) => {
  const { saveEvidenceFromBuffer } = await import('./database')
  return saveEvidenceFromBuffer(activityId, Buffer.from(bufferData), extension, caption)
})

ipcMain.handle('db:updateEvidenceCaption', async (_event, id: string, caption: string) => {
  const { updateEvidenceCaption } = await import('./database')
  return updateEvidenceCaption(id, caption)
})

ipcMain.handle('db:deleteEvidence', async (_event, id: string) => {
  const { deleteEvidence } = await import('./database')
  return deleteEvidence(id)
})

ipcMain.handle('db:getEvidenceFilePath', async (_event, id: string) => {
  const { getEvidenceFilePath } = await import('./database')
  return getEvidenceFilePath(id)
})

ipcMain.handle('db:reorderEvidences', async (_event, items) => {
  const { reorderEvidences } = await import('./database')
  return reorderEvidences(items)
})

ipcMain.handle('db:getDeletedEvidences', async () => {
  const { getDeletedEvidences } = await import('./database')
  return getDeletedEvidences()
})

ipcMain.handle('db:restoreEvidence', async (_event, id: string) => {
  const { restoreEvidence } = await import('./database')
  return restoreEvidence(id)
})

ipcMain.handle('db:permanentlyDeleteEvidence', async (_event, id: string) => {
  const { permanentlyDeleteEvidence } = await import('./database')
  return permanentlyDeleteEvidence(id)
})

ipcMain.handle('db:saveTextEvidence', async (_event, activityId: string, textContent: string, caption: string | null) => {
  const { saveTextEvidence } = await import('./database')
  return saveTextEvidence(activityId, textContent, caption)
})

ipcMain.handle('db:updateTextEvidence', async (_event, id: string, textContent: string) => {
  const { updateTextEvidence } = await import('./database')
  return updateTextEvidence(id, textContent)
})

// ──── Dialog IPC ────

ipcMain.handle('app:selectImages', async () => {
  if (!mainWindow) return []
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Imagens', extensions: ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'] },
    ],
  })
  return result.canceled ? [] : result.filePaths
})

// ──── Tray Status IPC ────

ipcMain.handle('app:setTrayStatus', (_event, status: 'default' | 'green' | 'yellow' | 'red') => {
  stopTrayBlink()
  setTrayIcon(status)
})

// ──── App Settings (JSON file in userData) ────

function getSettingsPath(): string {
  return path.join(app.getPath('userData'), 'settings.json')
}

function loadSettings(): Record<string, unknown> {
  const p = getSettingsPath()
  if (fs.existsSync(p)) {
    try { return JSON.parse(fs.readFileSync(p, 'utf-8')) } catch { /* ignore */ }
  }
  return {}
}

function saveSettingsFile(data: Record<string, unknown>): void {
  fs.writeFileSync(getSettingsPath(), JSON.stringify(data, null, 2), 'utf-8')
}

function ensureDirectoryExists(targetDir: string): string {
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true })
  }
  return targetDir
}

function getConfiguredReportsDir(): string {
  const configuredPath = loadSettings().reportsDirectory
  if (typeof configuredPath === 'string' && configuredPath.trim().length > 0) {
    return configuredPath
  }
  return path.join(app.getPath('userData'), 'reports')
}

function getEvidencesDirPath(): string {
  return path.join(app.getPath('userData'), 'evidences')
}

function getActiveWebContents(): WebContents | null {
  return BrowserWindow.getFocusedWindow()?.webContents ?? mainWindow?.webContents ?? null
}

function runEditCommand(command: 'undo' | 'redo' | 'cut' | 'copy' | 'paste' | 'selectAll'): boolean {
  const webContents = getActiveWebContents()
  if (!webContents) return false

  switch (command) {
    case 'undo':
      webContents.undo()
      return true
    case 'redo':
      webContents.redo()
      return true
    case 'cut':
      webContents.cut()
      return true
    case 'copy':
      webContents.copy()
      return true
    case 'paste':
      webContents.paste()
      return true
    case 'selectAll':
      webContents.selectAll()
      return true
    default:
      return false
  }
}

function runZoomCommand(command: 'in' | 'out' | 'reset'): boolean {
  const webContents = getActiveWebContents()
  if (!webContents) return false

  const currentLevel = webContents.getZoomLevel()
  if (command === 'reset') {
    webContents.setZoomLevel(0)
    return true
  }

  const delta = command === 'in' ? 0.5 : -0.5
  const nextLevel = Math.max(-8, Math.min(8, currentLevel + delta))
  webContents.setZoomLevel(nextLevel)
  return true
}

ipcMain.handle('app:getSettings', () => {
  return getPublicSettings(loadSettings())
})

ipcMain.handle('app:saveSettings', (_event, partial: Record<string, unknown>) => {
  const current = loadSettings()
  const merged = {
    ...getPublicSettings(current),
    ...getPublicSettings(partial),
  }
  const persistedUpdateState = readPersistedUpdateState(current)
  const nextSettings = Object.keys(persistedUpdateState).length > 0
    ? { ...merged, [INTERNAL_UPDATE_SETTINGS_KEY]: persistedUpdateState }
    : merged

  saveSettingsFile(nextSettings)
  return getPublicSettings(nextSettings)
})

ipcMain.handle('app:selectDirectory', async () => {
  if (!mainWindow) return null
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Selecionar pasta para relatórios',
  })
  return result.canceled ? null : result.filePaths[0]
})

ipcMain.handle('app:getDefaultReportsDir', () => {
  return path.join(app.getPath('userData'), 'reports')
})

ipcMain.handle('app:openReportsDirectory', async () => {
  const reportsDir = ensureDirectoryExists(getConfiguredReportsDir())
  const error = await shell.openPath(reportsDir)
  return error.length === 0
})

ipcMain.handle('app:openEvidencesDirectory', async () => {
  const evidencesDir = ensureDirectoryExists(getEvidencesDirPath())
  const error = await shell.openPath(evidencesDir)
  return error.length === 0
})

ipcMain.handle('app:quit', () => {
  tray?.destroy()
  tray = null
  app.quit()
})

ipcMain.handle('app:editUndo', () => runEditCommand('undo'))
ipcMain.handle('app:editRedo', () => runEditCommand('redo'))
ipcMain.handle('app:editCut', () => runEditCommand('cut'))
ipcMain.handle('app:editCopy', () => runEditCommand('copy'))
ipcMain.handle('app:editPaste', () => runEditCommand('paste'))
ipcMain.handle('app:editSelectAll', () => runEditCommand('selectAll'))

ipcMain.handle('app:zoomIn', () => runZoomCommand('in'))
ipcMain.handle('app:zoomOut', () => runZoomCommand('out'))
ipcMain.handle('app:zoomReset', () => runZoomCommand('reset'))

// ──── Sound Playback IPC ────

function getSoundsDir(): string {
  return resolveSoundsDir(getRuntimePaths())
}

ipcMain.handle('app:listSounds', () => {
  const dir = getSoundsDir()
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir).filter(f => f.endsWith('.mp3')).sort()
})

ipcMain.handle('app:getSoundPath', (_event, filename: string) => {
  // Sanitize filename to prevent path traversal
  const safe = path.basename(filename)
  const filePath = path.join(getSoundsDir(), safe)
  if (!fs.existsSync(filePath)) return null
  return filePath
})

ipcMain.handle('app:playSound', (_event, filename: string) => {
  const safe = path.basename(filename)
  const filePath = path.join(getSoundsDir(), safe)
  if (!fs.existsSync(filePath)) return false
  // Send file data to renderer for playback via data URL
  const buffer = fs.readFileSync(filePath)
  const base64 = buffer.toString('base64')
  mainWindow?.webContents.send('app:playSoundData', `data:audio/mpeg;base64,${base64}`)
  return true
})

// ──── Auto-launch IPC ────

ipcMain.handle('app:getAutoLaunch', () => {
  return app.getLoginItemSettings().openAtLogin
})

ipcMain.handle('app:setAutoLaunch', (_event, enabled: boolean) => {
  app.setLoginItemSettings({ openAtLogin: enabled })
  return app.getLoginItemSettings().openAtLogin
})

// ──── Report Generation IPC ────

ipcMain.handle('app:generateReport', async (_event, monthReference: string) => {
  try {
    const { getReportPayload, saveReport } = await import('./database')
    const { generateDocxReport, openInFolder } = await import('./report-generator')
    const { v7: uuidv7 } = await import('uuid')

    const { profile, activities } = await getReportPayload(monthReference)
    if (!profile) {
      return { success: false, error: 'Perfil do usuário não encontrado.' }
    }
    if (activities.length === 0) {
      return { success: false, error: 'Nenhuma atividade encontrada para este mês.' }
    }

    const result = await generateDocxReport({
      profile,
      activities,
      monthReference,
      reportsDir: loadSettings().reportsDirectory as string | undefined,
    })

    // Save report record in DB
    await saveReport({
      id: uuidv7(),
      month_reference: monthReference,
      file_path: result.filePath,
      report_name: result.reportName,
      status: 'Gerado',
      activityIds: activities.map(a => a.id),
    })

    return { success: true, filePath: result.filePath }
  } catch (err: any) {
    console.error('Report generation error:', err)
    return { success: false, error: err.message || 'Erro desconhecido ao gerar relatório.' }
  }
})

ipcMain.handle('app:openFileInFolder', async (_event, filePath: string) => {
  const { openInFolder } = await import('./report-generator')
  openInFolder(filePath)
})

ipcMain.handle('app:copyImageToClipboard', async (_event, filePath: string) => {
  // Segurança: só permite arquivos dentro de evidences/ ou trash/ (mesma regra do protocolo)
  const evidencesDir = path.join(app.getPath('userData'), 'evidences')
  const trashDir = path.join(app.getPath('userData'), 'trash')
  const resolved = path.resolve(filePath)
  if (!resolved.startsWith(evidencesDir) && !resolved.startsWith(trashDir)) return false
  const image = nativeImage.createFromPath(resolved)
  if (image.isEmpty()) return false
  clipboard.writeImage(image)
  return true
})

ipcMain.handle('db:getReports', async (_event, monthReference: string) => {
  const { getReports } = await import('./database')
  return getReports(monthReference)
})

// ──── Alert IPC ────

ipcMain.handle('db:getAlert', async () => {
  const { getAlert } = await import('./database')
  return getAlert()
})

ipcMain.handle('db:saveAlert', async (_event, data) => {
  const { saveAlert } = await import('./database')
  return saveAlert(data)
})

// ──── Alert Scheduler ────

function getCurrentMonthRef(): string {
  const now = new Date()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const yyyy = now.getFullYear()
  return `${mm}/${yyyy}`
}

function getDaysUntilEndOfMonth(): number {
  const now = new Date()
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return lastDay.getDate() - now.getDate()
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

async function checkAndFireAlerts(): Promise<void> {
  try {
    const { getAlert, updateLastAlertSent, countIncompleteActivities } = await import('./database')
    const alert = await getAlert()
    if (!alert || !alert.alert_enabled) return

    const now = new Date()
    const daysLeft = getDaysUntilEndOfMonth()

    // Parse config arrays
    const daysBefore: number[] = JSON.parse(alert.alert_days_before || '[]')
    const frequencies: number[] = JSON.parse(alert.alert_frequency || '[]')

    // Check if today matches any alert day
    const dayIndex = daysBefore.indexOf(daysLeft)
    if (dayIndex === -1) return

    // Check if current time >= alert_time
    const [alertHour, alertMin] = (alert.alert_time || '09:00').split(':').map(Number)
    if (now.getHours() < alertHour || (now.getHours() === alertHour && now.getMinutes() < alertMin)) return

    // Check if we already alerted today
    if (alert.last_alert_sent && isSameDay(new Date(alert.last_alert_sent), now)) return

    // Check incomplete activities
    const monthRef = getCurrentMonthRef()
    const incomplete = await countIncompleteActivities(monthRef)
    if (incomplete === 0) return

    // Fire notification
    const notification = new Notification({
      title: 'ShipIt! — Lembrete',
      body: alert.alert_message || `Você tem ${incomplete} atividade(s) pendente(s) para o relatório mensal.`,
      icon: createNotificationIcon(),
    })
    notification.on('click', () => {
      focusMainWindow()
    })
    notification.show()

    // Play sound if enabled
    if (alert.alert_sound_enabled) {
      const settings = loadSettings()
      const soundFile = (settings.alertSound as string) || alert.alert_sound_file
      if (soundFile) {
        const safe = path.basename(soundFile)
        const filePath = path.join(getSoundsDir(), safe)
        if (fs.existsSync(filePath)) {
          const buffer = fs.readFileSync(filePath)
          const base64 = buffer.toString('base64')
          mainWindow?.webContents.send('app:playSoundData', `data:audio/mpeg;base64,${base64}`)
        }
      }
    }

    await updateLastAlertSent()
  } catch (err) {
    console.error('Alert scheduler error:', err)
  }
}

// ──── Tray Auto-Status ────

function setTrayIcon(status: 'default' | 'green' | 'yellow' | 'red'): void {
  if (!tray) return
  tray.setImage(createTrayIconImage(status))
}

let trayBlinkState = false
let trayBlinkIntervalId: ReturnType<typeof setInterval> | null = null

function startTrayBlink(status: 'yellow' | 'red'): void {
  stopTrayBlink()
  trayBlinkState = false
  trayBlinkIntervalId = setInterval(() => {
    trayBlinkState = !trayBlinkState
    setTrayIcon(trayBlinkState ? status : 'default')
  }, 1000)
}

function stopTrayBlink(): void {
  if (trayBlinkIntervalId) {
    clearInterval(trayBlinkIntervalId)
    trayBlinkIntervalId = null
  }
}

async function updateTrayStatus(): Promise<void> {
  try {
    const { countIncompleteActivities, countActivities } = await import('./database')
    const monthRef = getCurrentMonthRef()
    const incomplete = await countIncompleteActivities(monthRef)
    const total = await countActivities(monthRef)
    const daysLeft = getDaysUntilEndOfMonth()

    if (total === 0) {
      // No activities yet — default icon
      stopTrayBlink()
      setTrayIcon('default')
    } else if (incomplete === 0) {
      // All good
      stopTrayBlink()
      setTrayIcon('green')
    } else if (daysLeft <= 3) {
      // Urgent — blink red
      startTrayBlink('red')
    } else {
      // Has incomplete — blink yellow
      startTrayBlink('yellow')
    }
  } catch (err) {
    console.error('Tray status update error:', err)
  }
}

function startSchedulers(): void {
  // Check alerts every minute
  alertIntervalId = setInterval(checkAndFireAlerts, 60_000)
  // Check tray status every 5 minutes
  trayIntervalId = setInterval(updateTrayStatus, 300_000)

  // Run immediately on startup (with a small delay to let DB init)
  setTimeout(async () => {
    checkAndFireAlerts()
    updateTrayStatus()
  }, 3000)
}

function stopSchedulers(): void {
  if (alertIntervalId) { clearInterval(alertIntervalId); alertIntervalId = null }
  if (trayIntervalId) { clearInterval(trayIntervalId); trayIntervalId = null }
  stopTrayBlink()
}

// ──── Window Controls IPC ────

// ──── Auto-Update IPC ────

ipcMain.handle('app:getUpdateState', () => {
  return getUpdateService().getCurrentState()
})

ipcMain.handle('app:checkForUpdate', async () => {
  return getUpdateService().checkForUpdates()
})

ipcMain.handle('app:downloadUpdate', async () => {
  return getUpdateService().downloadUpdate()
})

ipcMain.handle('app:installUpdate', () => {
  getUpdateService().installUpdate()
})

ipcMain.handle('app:acknowledgeUpdateAttention', (_event, version?: string) => {
  const normalizedVersion = normalizeStoredVersion(version)
  const nextState = getUpdateService().acknowledgeAttention(normalizedVersion)

  if (normalizedVersion) {
    const persistedState = readPersistedUpdateState()
    savePersistedUpdateState({
      ...persistedState,
      acknowledgedVersion: normalizedVersion,
      lastAttentionViewedAt: new Date().toISOString(),
    })
  }

  currentUpdateState = nextState
  applyUpdateAttentionIndicator(nextState)
  return nextState
})

// ──── Window Controls IPC ────

ipcMain.handle('window:minimize', () => {
  mainWindow?.minimize()
})

ipcMain.handle('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize()
  } else {
    mainWindow?.maximize()
  }
})

ipcMain.handle('window:close', () => {
  if (tray) {
    mainWindow?.hide()
  } else {
    mainWindow?.close()
  }
})

ipcMain.handle('window:isMaximized', () => {
  return mainWindow?.isMaximized() ?? false
})
