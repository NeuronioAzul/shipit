// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { StartupMigrationInfo, StartupMigrationResult } from '../vite-env'
import { MigrationGate } from './MigrationGate'

const INFO: StartupMigrationInfo = {
  fromVersion: '1.13.0',
  toVersion: '1.14.0',
  plannedBackupPath: 'C:\\Users\\ana\\AppData\\Roaming\\ShipIt!\\backups\\shipit-backup-antes-v1.14.0-20260911-140509.db',
  backupsDir: 'C:\\Users\\ana\\AppData\\Roaming\\ShipIt!\\backups',
  userDataDir: 'C:\\Users\\ana\\AppData\\Roaming\\ShipIt!',
  releasesUrl: 'https://github.com/NeuronioAzul/shipit/releases',
  countdownSeconds: 30,
}

function stubElectronAPI(overrides: Partial<Record<string, unknown>> = {}) {
  const api = {
    runStartupMigration: vi.fn<() => Promise<StartupMigrationResult>>(),
    openFileInFolder: vi.fn().mockResolvedValue(undefined),
    openReleasesPage: vi.fn().mockResolvedValue(undefined),
    quitApp: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
  ;(window as unknown as { electronAPI: unknown }).electronAPI = api
  return api
}

function confirmButton(): HTMLButtonElement {
  return screen.getByRole('button', { name: /Entendi, fazer backup e atualizar/ }) as HTMLButtonElement
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  delete (window as unknown as { electronAPI?: unknown }).electronAPI
})

describe('MigrationGate — aviso', () => {
  it('shows the four mandatory pieces of information', () => {
    stubElectronAPI()
    render(<MigrationGate info={INFO} onFinished={() => {}} />)

    // 1) mudanças importantes  2) backup será feito
    expect(screen.getByText(/mudanças importantes/)).toBeTruthy()
    expect(screen.getByText(/será feito um backup do seu banco de dados/)).toBeTruthy()
    // 3) caminho do backup
    expect(screen.getByText(INFO.plannedBackupPath)).toBeTruthy()
    // 4) passos de downgrade com pasta de dados e link de versões
    expect(screen.getByText(/voltar para a versão 1.13.0/)).toBeTruthy()
    expect(screen.getByText(INFO.userDataDir)).toBeTruthy()
    expect(screen.getByRole('button', { name: INFO.releasesUrl })).toBeTruthy()
    expect(screen.getByText(/não tinham ambiente marcado não serão mantidas/)).toBeTruthy()
  })

  it('keeps the confirm button disabled until the countdown ends', () => {
    stubElectronAPI()
    render(<MigrationGate info={INFO} onFinished={() => {}} />)

    expect(confirmButton().disabled).toBe(true)
    expect(confirmButton().textContent).toContain('(30 s)')

    act(() => { vi.advanceTimersByTime(29_000) })
    expect(confirmButton().disabled).toBe(true)
    expect(confirmButton().textContent).toContain('(1 s)')

    act(() => { vi.advanceTimersByTime(1_000) })
    expect(confirmButton().disabled).toBe(false)
    expect(confirmButton().textContent).not.toContain(' s)')
    expect(screen.getByText('Você já pode continuar.')).toBeTruthy()
  })

  it('does not close on Escape', () => {
    stubElectronAPI()
    render(<MigrationGate info={INFO} onFinished={() => {}} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.getByRole('alertdialog')).toBeTruthy()
  })

  it('describes an unknown previous version generically', () => {
    stubElectronAPI()
    render(<MigrationGate info={{ ...INFO, fromVersion: null }} onFinished={() => {}} />)
    expect(screen.getByText(/voltar para a versão anterior \(1\.13\.x ou mais antiga\)/)).toBeTruthy()
  })
})

describe('MigrationGate — execução', () => {
  it('runs the migration and shows the returned backup path and the open-app button', async () => {
    const onFinished = vi.fn()
    const realPath = 'D:\\dados\\backups\\shipit-backup-antes-v1.14.0-20260911-140510.db'
    const api = stubElectronAPI()
    api.runStartupMigration.mockResolvedValue({ success: true, backupPath: realPath })

    render(<MigrationGate info={{ ...INFO, countdownSeconds: 0 }} onFinished={onFinished} />)
    expect(confirmButton().disabled).toBe(false)

    await act(async () => { fireEvent.click(confirmButton()) })

    expect(api.runStartupMigration).toHaveBeenCalledTimes(1)
    expect(screen.getByText(/Atualização concluída/)).toBeTruthy()
    expect(screen.getByText(realPath)).toBeTruthy()
    expect(screen.queryByText(INFO.plannedBackupPath)).toBeNull()

    const steps = document.querySelectorAll('#migration-gate-steps li[data-state="done"]')
    expect(steps.length).toBe(3)

    fireEvent.click(screen.getByRole('button', { name: /Abrir pasta/ }))
    expect(api.openFileInFolder).toHaveBeenCalledWith(realPath)

    fireEvent.click(screen.getByRole('button', { name: /Abrir o ShipIt!/ }))
    expect(onFinished).toHaveBeenCalledTimes(1)
  })

  it('on backup failure says nothing changed and allows retrying', async () => {
    const api = stubElectronAPI()
    api.runStartupMigration
      .mockResolvedValueOnce({ success: false, stage: 'backup', error: 'ENOSPC: disco cheio' })
      .mockResolvedValueOnce({ success: true, backupPath: 'X:\\b.db' })

    render(<MigrationGate info={{ ...INFO, countdownSeconds: 0 }} onFinished={() => {}} />)
    await act(async () => { fireEvent.click(confirmButton()) })

    expect(screen.getByText(/Nada foi alterado/)).toBeTruthy()
    expect(screen.getByText(/ENOSPC: disco cheio/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Abrir o ShipIt!/ })).toBeNull()

    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Tentar novamente/ })) })
    expect(api.runStartupMigration).toHaveBeenCalledTimes(2)
    expect(screen.getByText('X:\\b.db')).toBeTruthy()
  })

  it('on migration failure shows the backup path, downgrade steps and no retry', async () => {
    const api = stubElectronAPI()
    api.runStartupMigration.mockResolvedValue({
      success: false,
      stage: 'migration',
      error: 'SQLITE_CORRUPT',
      backupPath: 'X:\\backup-ok.db',
    })

    render(<MigrationGate info={{ ...INFO, countdownSeconds: 0 }} onFinished={() => {}} />)
    await act(async () => { fireEvent.click(confirmButton()) })

    expect(screen.getByText(/A conversão dos dados falhou/)).toBeTruthy()
    expect(screen.getByText('X:\\backup-ok.db')).toBeTruthy()
    expect(screen.getByText(/voltar para a versão 1.13.0/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Tentar novamente/ })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /Fechar o app/ }))
    expect(api.quitApp).toHaveBeenCalledTimes(1)
  })

  it('opens the releases page through the main process', () => {
    const api = stubElectronAPI()
    render(<MigrationGate info={INFO} onFinished={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: INFO.releasesUrl }))
    expect(api.openReleasesPage).toHaveBeenCalledTimes(1)
  })
})
