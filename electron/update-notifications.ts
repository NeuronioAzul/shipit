export type UpdateStatusValue = 'checking' | 'available' | 'not-available' | 'downloaded' | 'error' | 'dev'

export interface UpdateStatusData {
  status: UpdateStatusValue
  version?: string
  error?: string
}

export interface UpdateCheckResult {
  status: UpdateStatusValue | 'already-checking'
  error?: string
}

export interface AutoUpdaterLike {
  autoDownload: boolean
  autoInstallOnAppQuit: boolean
  on: {
    (event: 'checking-for-update', listener: () => void): unknown
    (event: 'update-available', listener: (info: UpdateInfoLike) => void): unknown
    (event: 'update-not-available', listener: () => void): unknown
    (event: 'update-downloaded', listener: (info: UpdateInfoLike) => void): unknown
    (event: 'error', listener: (error: unknown) => void): unknown
  }
  checkForUpdates: () => Promise<unknown>
  quitAndInstall: () => void
}

export interface UpdateInfoLike {
  version?: string
}

export interface DesktopNotificationOptions {
  title: string
  body: string
  icon?: string
}

export interface DesktopNotificationLike {
  on: (event: 'click', listener: () => void) => unknown
  show: () => void
}

export type DesktopNotificationConstructor = new (options: DesktopNotificationOptions) => DesktopNotificationLike

export interface UpdateServiceOptions {
  autoUpdater: AutoUpdaterLike
  isPackaged: () => boolean
  sendStatus: (data: UpdateStatusData) => void
  Notification: DesktopNotificationConstructor
  getNotificationIcon: () => string | undefined
  focusSettings: () => void
}

export interface UpdateService {
  registerAutoUpdaterHandlers: () => void
  checkForUpdates: () => Promise<UpdateCheckResult>
  installUpdate: () => void
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Erro desconhecido ao verificar atualizações.'
}

export function getUpdateNotificationContent(
  status: 'available' | 'downloaded',
  version?: string,
): { title: string; body: string } {
  const versionLabel = version || 'mais recente'

  if (status === 'available') {
    return {
      title: 'ShipIt! - Atualização disponível',
      body: `Versão ${versionLabel} encontrada. O download começou automaticamente.`,
    }
  }

  return {
    title: 'ShipIt! - Atualização pronta',
    body: `Versão ${versionLabel} pronta para instalar. Reinicie pelo ShipIt! para concluir.`,
  }
}

export function showUpdateNotification(options: {
  status: 'available' | 'downloaded'
  version?: string
  Notification: DesktopNotificationConstructor
  icon?: string
  onClick: () => void
}): DesktopNotificationLike {
  const content = getUpdateNotificationContent(options.status, options.version)
  const notification = new options.Notification({
    ...content,
    icon: options.icon,
  })

  notification.on('click', options.onClick)
  notification.show()
  return notification
}

export function createUpdateService(options: UpdateServiceOptions): UpdateService {
  let handlersRegistered = false
  let checkInFlight: Promise<unknown> | null = null
  const notifiedKeys = new Set<string>()

  function sendStatus(data: UpdateStatusData): void {
    options.sendStatus(data)
  }

  function notifyOnce(status: 'available' | 'downloaded', version?: string): void {
    const key = `${status}:${version || 'unknown'}`
    if (notifiedKeys.has(key)) return

    notifiedKeys.add(key)
    showUpdateNotification({
      status,
      version,
      Notification: options.Notification,
      icon: options.getNotificationIcon(),
      onClick: options.focusSettings,
    })
  }

  function registerAutoUpdaterHandlers(): void {
    if (handlersRegistered) return
    handlersRegistered = true

    options.autoUpdater.on('checking-for-update', () => {
      sendStatus({ status: 'checking' })
    })

    options.autoUpdater.on('update-available', (info: UpdateInfoLike) => {
      const version = info.version
      sendStatus({ status: 'available', version })
      notifyOnce('available', version)
    })

    options.autoUpdater.on('update-not-available', () => {
      sendStatus({ status: 'not-available' })
    })

    options.autoUpdater.on('update-downloaded', (info: UpdateInfoLike) => {
      const version = info.version
      sendStatus({ status: 'downloaded', version })
      notifyOnce('downloaded', version)
    })

    options.autoUpdater.on('error', (error: unknown) => {
      sendStatus({ status: 'error', error: getErrorMessage(error) })
    })
  }

  async function checkForUpdates(): Promise<UpdateCheckResult> {
    if (!options.isPackaged()) {
      const result: UpdateStatusData = { status: 'dev' }
      sendStatus(result)
      return result
    }

    if (checkInFlight) {
      return { status: 'already-checking' }
    }

    try {
      checkInFlight = options.autoUpdater.checkForUpdates()
      await checkInFlight
      return { status: 'checking' }
    } catch (error) {
      const result: UpdateStatusData = { status: 'error', error: getErrorMessage(error) }
      sendStatus(result)
      return result
    } finally {
      checkInFlight = null
    }
  }

  function installUpdate(): void {
    options.autoUpdater.quitAndInstall()
  }

  return {
    registerAutoUpdaterHandlers,
    checkForUpdates,
    installUpdate,
  }
}
