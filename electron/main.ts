import 'reflect-metadata'
import { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, dialog, protocol, net } from 'electron'
import path from 'path'
import fs from 'fs'

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
const isDev = !app.isPackaged

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 900,
    minHeight: 600,
    show: false,
    icon: path.join(__dirname, '..', 'images', 'icons', 'favicon-96x96.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: 'default',
    title: 'ShipIt!',
  })

  if (isDev) {
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
}

function createTray() {
  const trayIconPath = path.join(
    __dirname,
    '..',
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

app.whenReady().then(() => {
  // Register custom protocol to serve evidence images securely
  protocol.handle('shipit-evidence', (request) => {
    const url = new URL(request.url)
    const filePath = url.searchParams.get('path')
    if (!filePath) {
      return new Response('Missing path', { status: 400 })
    }
    // Security: only allow files inside the evidences directory
    const evidencesDir = path.join(app.getPath('userData'), 'evidences')
    const resolved = path.resolve(filePath)
    if (!resolved.startsWith(evidencesDir)) {
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
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
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
  if (!tray) return
  const statusMap: Record<string, string> = {
    default: 'tray-icon-foguete-dark-mode-default-2-escuro.png',
    green: 'tray-icon-foguete-dark-mode-verde-2-escuro.png',
    yellow: 'tray-icon-foguete-dark-mode-yellow-2-escuro.png',
    red: 'tray-icon-foguete-dark-mode-red-2-escuro.png',
  }
  const iconFile = statusMap[status] || statusMap['default']
  const iconPath = path.join(__dirname, '..', 'images', 'tray', iconFile)
  const icon = nativeImage.createFromPath(iconPath)
  if (!icon.isEmpty()) {
    tray.setImage(icon.resize({ width: 16, height: 16 }))
  }
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
