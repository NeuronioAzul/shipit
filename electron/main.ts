import 'reflect-metadata'
import { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, dialog, protocol, net, Notification } from 'electron'
import path from 'path'
import fs from 'fs'

// Set AppUserModelId for Windows notifications to show correct app name and icon
if (process.platform === 'win32') {
  app.setAppUserModelId('com.neuronioazul.shipit')
}

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let alertIntervalId: ReturnType<typeof setInterval> | null = null
let trayIntervalId: ReturnType<typeof setInterval> | null = null
const isDev = !app.isPackaged

protocol.registerSchemesAsPrivileged([
  { scheme: 'shipit-evidence', privileges: { supportFetchAPI: true, stream: true } },
  { scheme: 'shipit-sfx', privileges: { supportFetchAPI: true, stream: true } },
])

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 800,
    minHeight: 600,
    show: false,
    icon: path.join(__dirname, '..', 'assets', 'images', 'icons', 'favicon-96x96.png'),
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

  // Notify renderer of maximize/unmaximize changes
  mainWindow.on('maximize', () => {
    mainWindow?.webContents.send('window:maximized-change', true)
  })
  mainWindow.on('unmaximize', () => {
    mainWindow?.webContents.send('window:maximized-change', false)
  })
}

function createTray() {
  const trayIconPath = path.join(
    __dirname,
    '..',
    'assets',
    'images',
    'tray',
    'tray-icon-foguete-dark-mode-default-2-escuro.png'
  )
  const icon = nativeImage.createFromPath(trayIconPath)
  const trayIcon = icon.isEmpty() ? nativeImage.createEmpty() : icon.resize({ width: 16, height: 16 })
  tray = new Tray(trayIcon)

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Abrir ShipIt!',
      click: () => {
        mainWindow?.show()
        mainWindow?.focus()
      },
    },
    { type: 'separator' },
    {
      label: 'Nova Atividade',
      click: () => {
        mainWindow?.show()
        mainWindow?.focus()
        mainWindow?.webContents.send('app:navigate', '/activities/new')
      },
    },
    {
      label: 'Dashboard',
      click: () => {
        mainWindow?.show()
        mainWindow?.focus()
        mainWindow?.webContents.send('app:navigate', '/')
      },
    },
    {
      label: 'Atividades',
      click: () => {
        mainWindow?.show()
        mainWindow?.focus()
        mainWindow?.webContents.send('app:navigate', '/activities')
      },
    },
    {
      label: 'Perfil',
      click: () => {
        mainWindow?.show()
        mainWindow?.focus()
        mainWindow?.webContents.send('app:navigate', '/profile')
      },
    },
    {
      label: 'Configurações',
      click: () => {
        mainWindow?.show()
        mainWindow?.focus()
        mainWindow?.webContents.send('app:navigate', '/settings')
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
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.focus()
      } else {
        mainWindow.show()
        mainWindow.focus()
      }
    }
  })
}

app.whenReady().then(async () => {
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

ipcMain.handle('app:getSettings', () => {
  return loadSettings()
})

ipcMain.handle('app:saveSettings', (_event, partial: Record<string, unknown>) => {
  const current = loadSettings()
  const merged = { ...current, ...partial }
  saveSettingsFile(merged)
  return merged
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

// ──── Sound Playback IPC ────

function getSoundsDir(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'app.asar', 'assets', 'sounds')
  }
  // In dev mode, app.getAppPath() returns project root
  return path.join(app.getAppPath(), 'assets', 'sounds')
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
      icon: path.join(__dirname, '..', 'assets', 'images', 'icons', 'favicon-96x96.png'),
    })
    notification.on('click', () => {
      mainWindow?.show()
      mainWindow?.focus()
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
  const statusMap: Record<string, string> = {
    default: 'tray-icon-foguete-dark-mode-default-2-escuro.png',
    green: 'tray-icon-foguete-dark-mode-verde-2-escuro.png',
    yellow: 'tray-icon-foguete-dark-mode-yellow-2-escuro.png',
    red: 'tray-icon-foguete-dark-mode-red-2-escuro.png',
  }
  const iconFile = statusMap[status] || statusMap['default']
  const iconPath = path.join(__dirname, '..', 'assets', 'images', 'tray', iconFile)
  const icon = nativeImage.createFromPath(iconPath)
  if (!icon.isEmpty()) {
    tray.setImage(icon.resize({ width: 16, height: 16 }))
  }
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
