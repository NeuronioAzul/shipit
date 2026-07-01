import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { toastSuccess, toastError } = vi.hoisted(() => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: { success: toastSuccess, error: toastError },
}))

import { copyTextToClipboard } from './clipboard'

beforeEach(() => {
  toastSuccess.mockClear()
  toastError.mockClear()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('copyTextToClipboard', () => {
  it('copies the text and shows a success toast', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })

    await copyTextToClipboard('12345', 'Release 12345')

    expect(writeText).toHaveBeenCalledWith('12345')
    expect(toastSuccess).toHaveBeenCalledWith('Release 12345 copiado com sucesso.')
    expect(toastError).not.toHaveBeenCalled()
  })

  it('shows an error toast when the clipboard API is unavailable', async () => {
    vi.stubGlobal('navigator', {})

    await copyTextToClipboard('12345', 'Release 12345')

    expect(toastError).toHaveBeenCalledWith('Seu ambiente não permite copiar automaticamente.')
    expect(toastSuccess).not.toHaveBeenCalled()
  })

  it('shows an error toast when writeText rejects', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('denied'))
    vi.stubGlobal('navigator', { clipboard: { writeText } })

    await copyTextToClipboard('12345', 'Release 12345')

    expect(toastError).toHaveBeenCalledWith('Não foi possível copiar release 12345.')
    expect(toastSuccess).not.toHaveBeenCalled()
  })
})
