// Test-only fake autoUpdater used by E2E (Playwright) when
// `SHIPIT_E2E_FAKE_UPDATER=1` is set. It implements AutoUpdaterLike from
// `./update-notifications` and exposes control hooks so a test can drive the
// full update lifecycle through the real IPC pipeline.

import type { AutoUpdaterLike, UpdateCheckOutcomeLike, UpdateInfoLike, DownloadProgressLike } from './update-notifications'

type FakeListener = (...args: any[]) => void

export interface FakeCheckBehavior {
  outcome: 'not-available' | 'available' | 'error' | 'silent'
  version?: string
  error?: string
}

export interface FakeDownloadBehavior {
  outcome: 'downloaded' | 'error'
  version?: string
  error?: string
  progress?: number[]
}

export interface FakeAutoUpdaterControl extends AutoUpdaterLike {
  __setCheckBehavior(behavior: FakeCheckBehavior): void
  __setDownloadBehavior(behavior: FakeDownloadBehavior): void
  __emit(event: string, payload?: unknown): void
  __reset(): void
  __getQuitAndInstallCalls(): number
}

export function createFakeAutoUpdater(): FakeAutoUpdaterControl {
  const listeners = new Map<string, FakeListener[]>()
  let checkBehavior: FakeCheckBehavior = { outcome: 'not-available' }
  let downloadBehavior: FakeDownloadBehavior = { outcome: 'downloaded', version: '1.3.7' }
  let quitAndInstallCalls = 0

  function on(event: string, listener: FakeListener): void {
    const arr = listeners.get(event) ?? []
    arr.push(listener)
    listeners.set(event, arr)
  }

  function emit(event: string, ...args: unknown[]): void {
    for (const listener of listeners.get(event) ?? []) {
      try { listener(...args) } catch { /* swallow to keep parity with electron-updater */ }
    }
  }

  function checkForUpdates(): Promise<UpdateCheckOutcomeLike | null> {
    emit('checking-for-update')

    return new Promise((resolve) => {
      // Emit terminal event in a microtask so the service has fully awaited.
      queueMicrotask(() => {
        switch (checkBehavior.outcome) {
          case 'available': {
            const info: UpdateInfoLike = { version: checkBehavior.version ?? '1.3.7' }
            emit('update-available', info)
            resolve({ updateInfo: info })
            return
          }
          case 'not-available': {
            emit('update-not-available')
            resolve(null)
            return
          }
          case 'error': {
            emit('error', new Error(checkBehavior.error ?? 'Falha simulada'))
            resolve(null)
            return
          }
          case 'silent':
          default: {
            // Resolve without emitting any terminal event — regression for the
            // "stuck checking spinner" bug. The service must settle on its own.
            resolve(checkBehavior.version ? { updateInfo: { version: checkBehavior.version } } : null)
            return
          }
        }
      })
    })
  }

  function downloadUpdate(): Promise<unknown> {
    return new Promise((resolve) => {
      queueMicrotask(() => {
        const steps = downloadBehavior.progress ?? [25, 75, 100]
        for (const percent of steps) {
          const progress: DownloadProgressLike = { percent }
          emit('download-progress', progress)
        }

        if (downloadBehavior.outcome === 'downloaded') {
          const info: UpdateInfoLike = { version: downloadBehavior.version ?? '1.3.7' }
          emit('update-downloaded', info)
        } else {
          emit('error', new Error(downloadBehavior.error ?? 'Falha simulada no download'))
        }

        resolve(null)
      })
    })
  }

  function quitAndInstall(): void {
    quitAndInstallCalls += 1
  }

  return {
    autoDownload: false,
    autoInstallOnAppQuit: false,
    on,
    checkForUpdates,
    downloadUpdate,
    quitAndInstall,
    __setCheckBehavior(behavior) { checkBehavior = behavior },
    __setDownloadBehavior(behavior) { downloadBehavior = behavior },
    __emit: emit,
    __reset() {
      // Intentionally NOT clearing `listeners`: the update service registers
      // its handlers once at boot via `registerAutoUpdaterHandlers()`, so
      // dropping them would silently break subsequent tests.
      checkBehavior = { outcome: 'not-available' }
      downloadBehavior = { outcome: 'downloaded', version: '1.3.7' }
      quitAndInstallCalls = 0
    },
    __getQuitAndInstallCalls() { return quitAndInstallCalls },
  }
}
