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
  checkForUpdatesAndNotify = vi.fn<() => Promise<unknown>>(() => Promise.resolve(null))
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
  show = vi.fn()

  constructor(readonly options: DesktopNotificationOptions) {
    FakeNotification.instances.push(this)
  }

  on(event: 'click', listener: () => void): void {
    if (event === 'click') {
      this.clickHandlers.push(listener)
    }
  }

  click(): void {
    for (const handler of this.clickHandlers) {
      handler()
    }
  }
}

function createService(overrides: Partial<{
  updater: FakeAutoUpdater
  isPackaged: boolean
  statuses: UpdateStatusData[]
  focusSettings: () => void
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

    expect(secondCheck).toEqual({ status: 'already-checking' })
    expect(updater.checkForUpdates).toHaveBeenCalledTimes(1)
    expect(updater.checkForUpdatesAndNotify).not.toHaveBeenCalled()

    resolveCheck()
    await expect(firstCheck).resolves.toEqual({ status: 'checking' })
  })

  it('emits update statuses and deduplicates desktop notifications by version and status', () => {
    const { updater, statuses, focusSettings, service } = createService()
    service.registerAutoUpdaterHandlers()

    updater.emit('checking-for-update')
    updater.emit('update-available', { version: '1.3.3' })
    updater.emit('update-available', { version: '1.3.3' })
    updater.emit('update-downloaded', { version: '1.3.3' })
    updater.emit('update-not-available')
    updater.emit('error', new Error('Falha de rede'))

    expect(statuses).toEqual([
      { status: 'checking' },
      { status: 'available', version: '1.3.3' },
      { status: 'available', version: '1.3.3' },
      { status: 'downloaded', version: '1.3.3' },
      { status: 'not-available' },
      { status: 'error', error: 'Falha de rede' },
    ])
    expect(FakeNotification.instances).toHaveLength(2)
    expect(FakeNotification.instances[0].options).toMatchObject({
      title: 'ShipIt! - Atualização disponível',
      body: 'Versão 1.3.3 encontrada. O download começou automaticamente.',
      icon: 'shipit-icon',
    })
    expect(FakeNotification.instances[1].options).toMatchObject({
      title: 'ShipIt! - Atualização pronta',
      body: 'Versão 1.3.3 pronta para instalar. Reinicie pelo ShipIt! para concluir.',
      icon: 'shipit-icon',
    })

    FakeNotification.instances[0].click()
    expect(focusSettings).toHaveBeenCalledTimes(1)
  })

  it('returns dev status without checking remote updates outside packaged builds', async () => {
    const { updater, statuses, service } = createService({ isPackaged: false })

    await expect(service.checkForUpdates()).resolves.toEqual({ status: 'dev' })

    expect(statuses).toEqual([{ status: 'dev' }])
    expect(updater.checkForUpdates).not.toHaveBeenCalled()
  })

  it('exposes Portuguese notification copy for update states', () => {
    expect(getUpdateNotificationContent('available', '2.0.0')).toEqual({
      title: 'ShipIt! - Atualização disponível',
      body: 'Versão 2.0.0 encontrada. O download começou automaticamente.',
    })
    expect(getUpdateNotificationContent('downloaded', '2.0.0')).toEqual({
      title: 'ShipIt! - Atualização pronta',
      body: 'Versão 2.0.0 pronta para instalar. Reinicie pelo ShipIt! para concluir.',
    })
  })
})
