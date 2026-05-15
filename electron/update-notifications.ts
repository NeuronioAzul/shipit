export type UpdateStatusValue = 'checking' | 'available' | 'downloading' | 'not-available' | 'downloaded' | 'error' | 'dev'

export interface UpdateStatusData {
  status: UpdateStatusValue
  version?: string
  error?: string
  progress?: number
  attentionVisible: boolean
}

export interface UpdateCheckResult {
  status: UpdateStatusValue | 'already-checking'
  version?: string
  error?: string
  progress?: number
  attentionVisible: boolean
}

export interface AutoUpdaterLike {
  autoDownload: boolean
  autoInstallOnAppQuit: boolean
  on: {
    (event: 'checking-for-update', listener: () => void): unknown
    (event: 'update-available', listener: (info: UpdateInfoLike) => void): unknown
    (event: 'update-not-available', listener: () => void): unknown
    (event: 'download-progress', listener: (progress: DownloadProgressLike) => void): unknown
    (event: 'update-downloaded', listener: (info: UpdateInfoLike) => void): unknown
    (event: 'error', listener: (error: unknown) => void): unknown
  }
  checkForUpdates: () => Promise<UpdateCheckOutcomeLike | null | undefined | unknown>
  downloadUpdate: () => Promise<unknown>
  quitAndInstall: () => void
}

export interface UpdateCheckOutcomeLike {
  updateInfo?: UpdateInfoLike
}

export interface UpdateInfoLike {
  version?: string
}

export interface DownloadProgressLike {
  percent?: number
}

export interface DesktopNotificationAction {
  type: 'button'
  text: string
}

export interface DesktopNotificationOptions {
  title: string
  body: string
  icon?: string
  actions?: DesktopNotificationAction[]
}

export interface DesktopNotificationLike {
  on: {
    (event: 'click', listener: () => void): unknown
    (event: 'action', listener: (_event: unknown, index: number) => void): unknown
  }
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
  getCurrentVersion?: () => string
  initialState?: UpdateStatusData
  acknowledgedVersion?: string
  supportsNotificationActions?: boolean
}

export interface UpdateService {
  registerAutoUpdaterHandlers: () => void
  checkForUpdates: () => Promise<UpdateCheckResult>
  downloadUpdate: () => Promise<UpdateStatusData>
  installUpdate: () => void
  getCurrentState: () => UpdateStatusData
  acknowledgeAttention: (version?: string) => UpdateStatusData
  /** Test-only helper. Resets internal state so E2E tests can run in isolation. */
  resetForTests: () => void
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Erro desconhecido ao verificar atualizações.'
}

function clampProgress(progress?: number): number | undefined {
  if (typeof progress !== 'number' || Number.isNaN(progress)) {
    return undefined
  }

  return Math.max(0, Math.min(100, progress))
}

function normalizeUpdateState(input: UpdateStatusData): UpdateStatusData {
  const version = typeof input.version === 'string' && input.version.trim().length > 0
    ? input.version
    : undefined
  const error = typeof input.error === 'string' && input.error.trim().length > 0
    ? input.error
    : undefined

  return {
    status: input.status,
    version,
    error,
    progress: clampProgress(input.progress),
    attentionVisible: Boolean(input.attentionVisible),
  }
}

function createState(
  status: UpdateStatusValue,
  details: Omit<Partial<UpdateStatusData>, 'status'> = {},
): UpdateStatusData {
  return normalizeUpdateState({
    status,
    version: details.version,
    error: details.error,
    progress: details.progress,
    attentionVisible: details.attentionVisible ?? false,
  })
}

function createResult(status: UpdateCheckResult['status'], currentState: UpdateStatusData): UpdateCheckResult {
  return {
    status,
    version: currentState.version,
    error: currentState.error,
    progress: currentState.progress,
    attentionVisible: currentState.attentionVisible,
  }
}

export function getUpdateNotificationContent(
  status: 'available' | 'downloaded',
  version?: string,
): { title: string; body: string } {
  const versionLabel = version || 'mais recente'

  if (status === 'available') {
    return {
      title: 'ShipIt! - Atualização disponível',
      body: `Versão ${versionLabel} encontrada. Abra a área de atualização para baixar quando quiser.`,
    }
  }

  return {
    title: 'ShipIt! - Atualização pronta',
    body: `Versão ${versionLabel} pronta para instalar. Abra a área de atualização para concluir.`,
  }
}

export function showUpdateNotification(options: {
  status: 'available' | 'downloaded'
  version?: string
  Notification: DesktopNotificationConstructor
  icon?: string
  onClick: () => void
  actionText?: string
  onAction?: () => void
}): DesktopNotificationLike {
  const content = getUpdateNotificationContent(options.status, options.version)
  const notification = new options.Notification({
    ...content,
    icon: options.icon,
    actions: options.actionText ? [{ type: 'button', text: options.actionText }] : undefined,
  })

  notification.on('click', options.onClick)
  if (options.actionText && options.onAction) {
    notification.on('action', (_event, index) => {
      if (index === 0) {
        options.onAction?.()
      }
    })
  }
  notification.show()
  return notification
}

export function createUpdateService(options: UpdateServiceOptions): UpdateService {
  let handlersRegistered = false
  let checkInFlight: Promise<unknown> | null = null
  let downloadInFlight: Promise<unknown> | null = null
  let currentState = normalizeUpdateState(options.initialState ?? createState('not-available'))
  let acknowledgedVersion = options.acknowledgedVersion
  const notifiedKeys = new Set<string>()

  function sendStatus(data: UpdateStatusData): UpdateStatusData {
    currentState = normalizeUpdateState(data)
    options.sendStatus(currentState)
    return currentState
  }

  function shouldShowAttention(version?: string): boolean {
    return Boolean(version) && version !== acknowledgedVersion
  }

  function notifyOnce(status: 'available' | 'downloaded', version?: string, attentionVisible = currentState.attentionVisible): void {
    if (!attentionVisible) return

    const key = `${status}:${version || 'unknown'}`
    if (notifiedKeys.has(key)) return

    notifiedKeys.add(key)
    showUpdateNotification({
      status,
      version,
      Notification: options.Notification,
      icon: options.getNotificationIcon(),
      onClick: options.focusSettings,
      actionText: status === 'downloaded' && options.supportsNotificationActions ? 'Instalar agora' : undefined,
      onAction: status === 'downloaded' ? installUpdate : undefined,
    })
  }

  function registerAutoUpdaterHandlers(): void {
    if (handlersRegistered) return
    handlersRegistered = true

    options.autoUpdater.on('checking-for-update', () => {
      sendStatus(createState('checking', {
        version: currentState.version,
        attentionVisible: currentState.attentionVisible,
      }))
    })

    options.autoUpdater.on('update-available', (info: UpdateInfoLike) => {
      const version = info.version
      const nextState = sendStatus(createState('available', {
        version,
        attentionVisible: shouldShowAttention(version),
      }))
      notifyOnce('available', version, nextState.attentionVisible)
    })

    options.autoUpdater.on('update-not-available', () => {
      sendStatus(createState('not-available'))
    })

    options.autoUpdater.on('download-progress', (progress: DownloadProgressLike) => {
      sendStatus(createState('downloading', {
        version: currentState.version,
        progress: progress.percent,
        attentionVisible: currentState.attentionVisible,
      }))
    })

    options.autoUpdater.on('update-downloaded', (info: UpdateInfoLike) => {
      const version = info.version
      const nextState = sendStatus(createState('downloaded', {
        version,
        progress: 100,
        attentionVisible: shouldShowAttention(version),
      }))
      notifyOnce('downloaded', version, nextState.attentionVisible)
    })

    options.autoUpdater.on('error', (error: unknown) => {
      sendStatus(createState('error', {
        version: currentState.version,
        error: getErrorMessage(error),
        attentionVisible: currentState.attentionVisible,
      }))
    })
  }

  async function checkForUpdates(): Promise<UpdateCheckResult> {
    if (!options.isPackaged()) {
      const result = createState('dev')
      sendStatus(result)
      return result
    }

    if (currentState.status === 'downloaded' && currentState.version) {
      return currentState
    }

    if (checkInFlight) {
      return createResult('already-checking', currentState)
    }

    try {
      checkInFlight = options.autoUpdater.checkForUpdates()
      const outcome = (await checkInFlight) as UpdateCheckOutcomeLike | null | undefined

      if (currentState.status === 'checking') {
        const remoteVersion = typeof outcome?.updateInfo?.version === 'string' && outcome.updateInfo.version.trim().length > 0
          ? outcome.updateInfo.version
          : undefined
        const installedVersion = options.getCurrentVersion?.()

        if (remoteVersion && (!installedVersion || remoteVersion !== installedVersion)) {
          const nextState = sendStatus(createState('available', {
            version: remoteVersion,
            attentionVisible: shouldShowAttention(remoteVersion),
          }))
          notifyOnce('available', remoteVersion, nextState.attentionVisible)
        } else {
          sendStatus(createState('not-available'))
        }
      }

      return createResult(currentState.status, currentState)
    } catch (error) {
      const result = createState('error', {
        version: currentState.version,
        error: getErrorMessage(error),
        attentionVisible: currentState.attentionVisible,
      })
      sendStatus(result)
      return result
    } finally {
      checkInFlight = null
    }
  }

  async function downloadUpdate(): Promise<UpdateStatusData> {
    if (!options.isPackaged()) {
      const result = createState('dev')
      sendStatus(result)
      return result
    }

    if (currentState.status === 'downloading' || currentState.status === 'downloaded') {
      return currentState
    }

    if (currentState.status !== 'available' || !currentState.version) {
      return currentState
    }

    if (downloadInFlight) {
      return currentState
    }

    const version = currentState.version
    const attentionVisible = currentState.attentionVisible
    const downloadState = sendStatus(createState('downloading', {
      version,
      progress: 0,
      attentionVisible,
    }))

    try {
      downloadInFlight = options.autoUpdater.downloadUpdate()
      await downloadInFlight
      const settledState = getCurrentState()
      return settledState.status === 'downloaded' ? settledState : downloadState
    } catch (error) {
      const result = createState('error', {
        version,
        error: getErrorMessage(error),
        attentionVisible,
      })
      sendStatus(result)
      return result
    } finally {
      downloadInFlight = null
    }
  }

  function installUpdate(): void {
    try {
      options.autoUpdater.quitAndInstall()
    } catch (error) {
      // Ocorre quando o app é reiniciado antes de instalar: electron-updater
      // perde o caminho do arquivo em memória. Degrada para `available` para
      // que o usuário possa fazer o download novamente.
      sendStatus(createState('available', {
        version: currentState.version,
        error: getErrorMessage(error),
        attentionVisible: currentState.attentionVisible,
      }))
    }
  }

  function getCurrentState(): UpdateStatusData {
    return { ...currentState }
  }

  function acknowledgeAttention(version?: string): UpdateStatusData {
    if (!version) {
      return currentState
    }

    acknowledgedVersion = version

    if (currentState.version === version && currentState.attentionVisible) {
      return sendStatus({
        ...currentState,
        attentionVisible: false,
      })
    }

    return currentState
  }

  return {
    registerAutoUpdaterHandlers,
    checkForUpdates,
    downloadUpdate,
    installUpdate,
    getCurrentState,
    acknowledgeAttention,
    resetForTests: () => {
      checkInFlight = null
      downloadInFlight = null
      notifiedKeys.clear()
      acknowledgedVersion = options.acknowledgedVersion
      sendStatus(createState('not-available'))
    },
  }
}
