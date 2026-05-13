import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createUpdateService,
  getUpdateNotificationContent,
  type AutoUpdaterLike,
  type DesktopNotificationLike,
  type DesktopNotificationOptions,
  type UpdateStatusData,
} from './update-notifications.ts'

class FakeAutoUpdater implements AutoUpdaterLike {
  autoDownload = false
  autoInstallOnAppQuit = false
  listeners = new Map<string, ((...args: any[]) => void)[]>()
  checkForUpdates = vi.fn<() => Promise<unknown>>(() => Promise.resolve(null))
  downloadUpdate = vi.fn<() => Promise<unknown>>(() => Promise.resolve(null))
  quitAndInstall = vi.fn()

  on(event: string, listener: (...args: any[]) => void): void {
    const listeners = this.listeners.get(event) ?? []
    listeners.push(listener)
    this.listeners.set(event, listeners)
  }

  emit(event: string, ...args: unknown[]): void {
    for (const listener of this.listeners.get(event) ?? []) {
      listener(...args)
    }
  }
}

class FakeNotification implements DesktopNotificationLike {
  static instances: FakeNotification[] = []
  readonly clickHandlers: (() => void)[] = []
  readonly actionHandlers: Array<(_event: unknown, index: number) => void> = []
  show = vi.fn()

  constructor(readonly options: DesktopNotificationOptions) {
    FakeNotification.instances.push(this)
  }

  on(event: 'click' | 'action', listener: (() => void) | ((_event: unknown, index: number) => void)): void {
    if (event === 'click') {
      this.clickHandlers.push(listener as () => void)
      return
    }

    if (event === 'action') {
      this.actionHandlers.push(listener as (_event: unknown, index: number) => void)
    }
  }

  click(): void {
    for (const handler of this.clickHandlers) {
      handler()
    }
  }

  triggerAction(index: number): void {
    for (const handler of this.actionHandlers) {
      handler(undefined, index)
    }
  }
}

function createService(overrides: Partial<{
  updater: FakeAutoUpdater
  isPackaged: boolean
  statuses: UpdateStatusData[]
  focusSettings: () => void
  initialState: UpdateStatusData
  acknowledgedVersion: string
  supportsNotificationActions: boolean
}> = {}) {
  const updater = overrides.updater ?? new FakeAutoUpdater()
  const statuses = overrides.statuses ?? []
  const focusSettings = overrides.focusSettings ?? vi.fn()
  const service = createUpdateService({
    autoUpdater: updater,
    isPackaged: () => overrides.isPackaged ?? true,
    sendStatus: (data) => statuses.push(data),
    Notification: FakeNotification,
    getNotificationIcon: () => 'shipit-icon',
    focusSettings,
    initialState: overrides.initialState,
    acknowledgedVersion: overrides.acknowledgedVersion,
    supportsNotificationActions: overrides.supportsNotificationActions,
  })

  return { updater, statuses, focusSettings, service }
}

beforeEach(() => {
  FakeNotification.instances = []
})

describe('update notification service', () => {
  it('uses checkForUpdates and blocks concurrent manual checks', async () => {
    const updater = new FakeAutoUpdater()
    let resolveCheck!: () => void
    updater.checkForUpdates = vi.fn(() => new Promise<unknown>((resolve) => {
      resolveCheck = () => resolve(null)
    }))
    const { service } = createService({ updater })

    const firstCheck = service.checkForUpdates()
    const secondCheck = await service.checkForUpdates()

    expect(secondCheck).toEqual({ status: 'already-checking', attentionVisible: false })
    expect(updater.checkForUpdates).toHaveBeenCalledTimes(1)

    resolveCheck()
    await expect(firstCheck).resolves.toEqual({ status: 'not-available', attentionVisible: false })
  })

  it('returns settled state after autoUpdater check completes', async () => {
    const updater = new FakeAutoUpdater()
    updater.checkForUpdates = vi.fn(() => {
      updater.emit('update-not-available')
      return Promise.resolve(null)
    })
    const { service } = createService({ updater })
    service.registerAutoUpdaterHandlers()

    const result = await service.checkForUpdates()

    expect(result).toEqual({ status: 'not-available', attentionVisible: false })
    expect(service.getCurrentState().status).toBe('not-available')
  })

  it('emits manual update states and deduplicates desktop notifications by version and status', () => {
    const { updater, statuses, focusSettings, service } = createService({ supportsNotificationActions: true })
    service.registerAutoUpdaterHandlers()

    updater.emit('checking-for-update')
    updater.emit('update-available', { version: '1.3.3' })
    updater.emit('update-available', { version: '1.3.3' })
    updater.emit('download-progress', { percent: 35.2 })
    updater.emit('update-downloaded', { version: '1.3.3' })
    updater.emit('update-not-available')
    updater.emit('error', new Error('Falha de rede'))

    expect(statuses).toEqual([
      { status: 'checking', attentionVisible: false },
      { status: 'available', version: '1.3.3', attentionVisible: true },
      { status: 'available', version: '1.3.3', attentionVisible: true },
      { status: 'downloading', version: '1.3.3', progress: 35.2, attentionVisible: true },
      { status: 'downloaded', version: '1.3.3', progress: 100, attentionVisible: true },
      { status: 'not-available', attentionVisible: false },
      { status: 'error', error: 'Falha de rede', attentionVisible: false },
    ])
    expect(FakeNotification.instances).toHaveLength(2)
    expect(FakeNotification.instances[0].options).toMatchObject({
      title: 'ShipIt! - Atualização disponível',
      body: 'Versão 1.3.3 encontrada. Abra a área de atualização para baixar quando quiser.',
      icon: 'shipit-icon',
    })
    expect(FakeNotification.instances[1].options).toMatchObject({
      title: 'ShipIt! - Atualização pronta',
      body: 'Versão 1.3.3 pronta para instalar. Abra a área de atualização para concluir.',
      icon: 'shipit-icon',
      actions: [{ type: 'button', text: 'Instalar agora' }],
    })

    FakeNotification.instances[0].click()
    expect(focusSettings).toHaveBeenCalledTimes(1)

    FakeNotification.instances[1].triggerAction(0)
    expect(updater.quitAndInstall).toHaveBeenCalledTimes(1)
  })

  it('downloads updates manually and exposes current state', async () => {
    const updater = new FakeAutoUpdater()
    let resolveDownload!: () => void
    updater.downloadUpdate = vi.fn(() => new Promise<unknown>((resolve) => {
      resolveDownload = () => resolve(null)
    }))

    const { service, statuses } = createService({
      updater,
      initialState: { status: 'available', version: '2.0.0', attentionVisible: true },
    })

    const firstDownload = service.downloadUpdate()
    const secondDownload = await service.downloadUpdate()

    expect(secondDownload).toEqual({
      status: 'downloading',
      version: '2.0.0',
      progress: 0,
      attentionVisible: true,
    })
    expect(statuses).toEqual([
      { status: 'downloading', version: '2.0.0', progress: 0, attentionVisible: true },
    ])
    expect(updater.downloadUpdate).toHaveBeenCalledTimes(1)

    resolveDownload()
    await expect(firstDownload).resolves.toEqual({
      status: 'downloading',
      version: '2.0.0',
      progress: 0,
      attentionVisible: true,
    })
    expect(service.getCurrentState()).toEqual({
      status: 'downloading',
      version: '2.0.0',
      progress: 0,
      attentionVisible: true,
    })
  })

  it('returns dev status without checking remote updates outside packaged builds', async () => {
    const { updater, statuses, service } = createService({ isPackaged: false })

    await expect(service.checkForUpdates()).resolves.toEqual({ status: 'dev', attentionVisible: false })

    expect(statuses).toEqual([{ status: 'dev', attentionVisible: false }])
    expect(updater.checkForUpdates).not.toHaveBeenCalled()
  })

  it('acknowledges the current version and suppresses attention for an already seen release', () => {
    const { updater, statuses, service } = createService({
      acknowledgedVersion: '1.3.3',
    })
    service.registerAutoUpdaterHandlers()

    updater.emit('update-available', { version: '1.3.3' })
    updater.emit('update-available', { version: '1.3.4' })

    expect(statuses).toEqual([
      { status: 'available', version: '1.3.3', attentionVisible: false },
      { status: 'available', version: '1.3.4', attentionVisible: true },
    ])
    expect(FakeNotification.instances).toHaveLength(1)

    expect(service.acknowledgeAttention('1.3.4')).toEqual({
      status: 'available',
      version: '1.3.4',
      attentionVisible: false,
    })
    expect(service.getCurrentState()).toEqual({
      status: 'available',
      version: '1.3.4',
      attentionVisible: false,
    })
  })

  it('exposes Portuguese notification copy for update states', () => {
    expect(getUpdateNotificationContent('available', '2.0.0')).toEqual({
      title: 'ShipIt! - Atualização disponível',
      body: 'Versão 2.0.0 encontrada. Abra a área de atualização para baixar quando quiser.',
    })
    expect(getUpdateNotificationContent('downloaded', '2.0.0')).toEqual({
      title: 'ShipIt! - Atualização pronta',
      body: 'Versão 2.0.0 pronta para instalar. Abra a área de atualização para concluir.',
    })
  })
})
