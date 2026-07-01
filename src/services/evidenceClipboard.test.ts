import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { toastSuccess, toastError } = vi.hoisted(() => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: { success: toastSuccess, error: toastError },
}))

import {
  canUseEvidenceFileActions,
  copyEvidenceImage,
  openEvidenceLocation,
} from './evidenceClipboard'

const REAL_PATH = 'C:\\Users\\x\\evidences\\ev-1.png'

function stubElectronAPI(api: Record<string, unknown> | undefined) {
  vi.stubGlobal('window', api ? { electronAPI: api } : {})
}

beforeEach(() => {
  toastSuccess.mockClear()
  toastError.mockClear()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('canUseEvidenceFileActions', () => {
  it('returns false when electronAPI is unavailable (browser fallback)', () => {
    stubElectronAPI(undefined)
    expect(canUseEvidenceFileActions(REAL_PATH)).toBe(false)
  })

  it('returns false for empty/null paths', () => {
    stubElectronAPI({})
    expect(canUseEvidenceFileActions(null)).toBe(false)
    expect(canUseEvidenceFileActions(undefined)).toBe(false)
    expect(canUseEvidenceFileActions('')).toBe(false)
  })

  it('returns false for data URLs', () => {
    stubElectronAPI({})
    expect(canUseEvidenceFileActions('data:image/png;base64,AAAA')).toBe(false)
  })

  it('returns true for a real file path in Electron', () => {
    stubElectronAPI({})
    expect(canUseEvidenceFileActions(REAL_PATH)).toBe(true)
  })
})

describe('copyEvidenceImage', () => {
  it('copies via IPC and shows a success toast when the image is valid', async () => {
    const copyImageToClipboard = vi.fn().mockResolvedValue(true)
    stubElectronAPI({ copyImageToClipboard })

    await copyEvidenceImage(REAL_PATH)

    expect(copyImageToClipboard).toHaveBeenCalledWith(REAL_PATH)
    expect(toastSuccess).toHaveBeenCalledWith('Imagem copiada para a área de transferência')
    expect(toastError).not.toHaveBeenCalled()
  })

  it('shows an error toast when the IPC reports failure', async () => {
    const copyImageToClipboard = vi.fn().mockResolvedValue(false)
    stubElectronAPI({ copyImageToClipboard })

    await copyEvidenceImage(REAL_PATH)

    expect(toastError).toHaveBeenCalledWith('Não foi possível copiar a imagem')
    expect(toastSuccess).not.toHaveBeenCalled()
  })

  it('does nothing for non-actionable paths (data URL / no Electron)', async () => {
    const copyImageToClipboard = vi.fn().mockResolvedValue(true)
    stubElectronAPI({ copyImageToClipboard })

    await copyEvidenceImage('data:image/png;base64,AAAA')
    await copyEvidenceImage(null)

    expect(copyImageToClipboard).not.toHaveBeenCalled()
    expect(toastSuccess).not.toHaveBeenCalled()
    expect(toastError).not.toHaveBeenCalled()
  })
})

describe('openEvidenceLocation', () => {
  it('opens the file location via IPC for a real path', async () => {
    const openFileInFolder = vi.fn().mockResolvedValue(undefined)
    stubElectronAPI({ openFileInFolder })

    await openEvidenceLocation(REAL_PATH)

    expect(openFileInFolder).toHaveBeenCalledWith(REAL_PATH)
  })

  it('does nothing for non-actionable paths', async () => {
    const openFileInFolder = vi.fn().mockResolvedValue(undefined)
    stubElectronAPI({ openFileInFolder })

    await openEvidenceLocation('data:image/png;base64,AAAA')

    expect(openFileInFolder).not.toHaveBeenCalled()
  })
})
