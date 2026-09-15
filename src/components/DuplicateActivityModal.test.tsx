// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ActivityData } from '../vite-env'
import { DuplicateActivityModal, validateMonthReference } from './DuplicateActivityModal'

const { toastSuccessMock, toastErrorMock } = vi.hoisted(() => ({
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: {
    success: toastSuccessMock,
    error: toastErrorMock,
  },
}))

function makeActivity(overrides: Partial<ActivityData> = {}): ActivityData {
  return {
    id: 'act-1',
    order: 1,
    description: '<p>Implementação do módulo de relatórios</p>',
    date_start: '2026-03-02',
    date_end: '2026-03-10',
    link_ref: null,
    deployments: JSON.stringify({ Desenvolvimento: ['123'] }),
    status: 'Concluído',
    month_reference: '03/2026',
    attendance_type: 'Remoto',
    project_scope: 'Squad Alpha',
    last_updated: new Date().toISOString(),
    evidences: [
      { id: 'e1', activity_id: 'act-1', type: 'image', file_path: '/x/a.png', text_content: null, caption: null, sort_index: 0, date_added: '', deleted_at: null },
      { id: 'e2', activity_id: 'act-1', type: 'image', file_path: '/x/b.png', text_content: null, caption: null, sort_index: 1, date_added: '', deleted_at: null },
      { id: 'e3', activity_id: 'act-1', type: 'text', file_path: null, text_content: '<p>log</p>', caption: null, sort_index: 2, date_added: '', deleted_at: null },
    ],
    ...overrides,
  }
}

const duplicateActivityMock = vi.fn()

beforeEach(() => {
  duplicateActivityMock.mockReset()
  toastSuccessMock.mockReset()
  toastErrorMock.mockReset()
  ;(window as unknown as { electronAPI: unknown }).electronAPI = {
    duplicateActivity: duplicateActivityMock,
  }
})

afterEach(() => {
  cleanup()
  delete (window as unknown as { electronAPI?: unknown }).electronAPI
})

function monthInput(): HTMLInputElement {
  return document.getElementById('duplicate-activity-month') as HTMLInputElement
}

function checkbox(id: string): HTMLInputElement {
  return document.getElementById(id) as HTMLInputElement
}

function confirmButton(): HTMLButtonElement {
  return document.getElementById('duplicate-activity-confirm') as HTMLButtonElement
}

describe('validateMonthReference', () => {
  it('accepts MM/YYYY with month 01–12', () => {
    expect(validateMonthReference('01/2026')).toBeNull()
    expect(validateMonthReference('12/2030')).toBeNull()
    expect(validateMonthReference(' 09/2026 ')).toBeNull()
  })

  it('rejects wrong formats and months out of range', () => {
    expect(validateMonthReference('')).toBe('Informe o mês no formato MM/YYYY')
    expect(validateMonthReference('2026/09')).toBe('Informe o mês no formato MM/YYYY')
    expect(validateMonthReference('9/2026')).toBe('Informe o mês no formato MM/YYYY')
    expect(validateMonthReference('13/2026')).toBe('Mês deve estar entre 01 e 12')
    expect(validateMonthReference('00/2026')).toBe('Mês deve estar entre 01 e 12')
  })
})

describe('DuplicateActivityModal', () => {
  it('renders nothing when closed', () => {
    render(<DuplicateActivityModal activity={makeActivity()} open={false} onClose={() => {}} onDuplicated={() => {}} />)
    expect(document.getElementById('duplicate-activity-modal')).toBeNull()
  })

  it('opens with the original month pre-filled, options off and focus on the month input', () => {
    render(<DuplicateActivityModal activity={makeActivity()} open onClose={() => {}} onDuplicated={() => {}} />)

    expect(screen.getByRole('dialog', { name: 'Duplicar atividade' })).toBeTruthy()
    expect(monthInput().value).toBe('03/2026')
    expect(document.activeElement).toBe(monthInput())
    expect(checkbox('duplicate-activity-keep-dates').checked).toBe(false)
    expect(checkbox('duplicate-activity-copy-deployments').checked).toBe(false)
    expect(checkbox('duplicate-activity-copy-evidences').checked).toBe(false)
    expect(screen.getByText(/Implementação do módulo de relatórios/)).toBeTruthy()
  })

  it('shows the real evidence counts on the copy-evidences label', () => {
    render(<DuplicateActivityModal activity={makeActivity()} open onClose={() => {}} onDuplicated={() => {}} />)
    expect(screen.getByTestId('duplicate-activity-evidence-counts').textContent).toBe('(2 imagens, 1 texto)')
  })

  it('disables the copy-evidences option when the activity has no evidences', () => {
    render(<DuplicateActivityModal activity={makeActivity({ evidences: [] })} open onClose={() => {}} onDuplicated={() => {}} />)
    expect(screen.getByTestId('duplicate-activity-evidence-counts').textContent).toBe('(nenhuma)')
    expect(checkbox('duplicate-activity-copy-evidences').disabled).toBe(true)
  })

  it('blocks an invalid month with an inline error and does not call the API', async () => {
    render(<DuplicateActivityModal activity={makeActivity()} open onClose={() => {}} onDuplicated={() => {}} />)

    fireEvent.change(monthInput(), { target: { value: '13/2026' } })
    fireEvent.click(confirmButton())

    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(screen.getByRole('alert').textContent).toBe('Mês deve estar entre 01 e 12')
    expect(monthInput().getAttribute('aria-invalid')).toBe('true')
    expect(duplicateActivityMock).not.toHaveBeenCalled()

    // Digitar de novo limpa o erro
    fireEvent.change(monthInput(), { target: { value: '04/2026' } })
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('calls the API with the chosen options and emits the returned copy', async () => {
    const copy = makeActivity({ id: 'act-2', month_reference: '04/2026' })
    duplicateActivityMock.mockResolvedValue(copy)
    const onDuplicated = vi.fn()

    render(<DuplicateActivityModal activity={makeActivity()} open onClose={() => {}} onDuplicated={onDuplicated} />)

    fireEvent.change(monthInput(), { target: { value: '04/2026' } })
    fireEvent.click(checkbox('duplicate-activity-keep-dates'))
    fireEvent.click(checkbox('duplicate-activity-copy-evidences'))
    fireEvent.click(confirmButton())

    await waitFor(() => expect(onDuplicated).toHaveBeenCalledWith(copy))
    expect(duplicateActivityMock).toHaveBeenCalledWith('act-1', {
      monthReference: '04/2026',
      keepDates: true,
      copyDeployments: false,
      copyEvidences: true,
    })
    expect(toastSuccessMock).toHaveBeenCalledWith('Atividade duplicada')
  })

  it('confirms with Enter on the month input', async () => {
    const copy = makeActivity({ id: 'act-2' })
    duplicateActivityMock.mockResolvedValue(copy)
    const onDuplicated = vi.fn()

    render(<DuplicateActivityModal activity={makeActivity()} open onClose={() => {}} onDuplicated={onDuplicated} />)
    fireEvent.keyDown(monthInput(), { key: 'Enter' })

    await waitFor(() => expect(onDuplicated).toHaveBeenCalledWith(copy))
    expect(duplicateActivityMock).toHaveBeenCalledWith('act-1', {
      monthReference: '03/2026',
      keepDates: false,
      copyDeployments: false,
      copyEvidences: false,
    })
  })

  it('shows the busy state and disables both buttons while duplicating', async () => {
    let resolve!: (value: ActivityData) => void
    duplicateActivityMock.mockImplementation(() => new Promise<ActivityData>((r) => { resolve = r }))

    render(<DuplicateActivityModal activity={makeActivity()} open onClose={() => {}} onDuplicated={() => {}} />)
    fireEvent.click(confirmButton())

    await waitFor(() => expect(confirmButton().disabled).toBe(true))
    expect(confirmButton().textContent).toContain('Duplicando')
    expect((document.getElementById('duplicate-activity-cancel') as HTMLButtonElement).disabled).toBe(true)

    await act(async () => { resolve(makeActivity({ id: 'act-2' })) })
    await waitFor(() => expect(confirmButton().disabled).toBe(false))
  })

  it('shows an error toast and keeps the modal open when the API fails', async () => {
    duplicateActivityMock.mockRejectedValue(new Error('boom'))
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const onDuplicated = vi.fn()
    const onClose = vi.fn()

    render(<DuplicateActivityModal activity={makeActivity()} open onClose={onClose} onDuplicated={onDuplicated} />)
    fireEvent.click(confirmButton())

    await waitFor(() => expect(toastErrorMock).toHaveBeenCalledWith('Erro ao duplicar atividade'))
    expect(onDuplicated).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
    expect(document.getElementById('duplicate-activity-modal')).toBeTruthy()
    consoleError.mockRestore()
  })

  it('closes with Escape, Cancelar and backdrop click', () => {
    const onClose = vi.fn()
    render(<DuplicateActivityModal activity={makeActivity()} open onClose={onClose} onDuplicated={() => {}} />)

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)

    fireEvent.click(document.getElementById('duplicate-activity-cancel')!)
    expect(onClose).toHaveBeenCalledTimes(2)

    fireEvent.click(document.getElementById('duplicate-activity-modal')!)
    expect(onClose).toHaveBeenCalledTimes(3)
  })

  it('falls back to localDb when electronAPI is unavailable', async () => {
    delete (window as unknown as { electronAPI?: unknown }).electronAPI
    const { localDb } = await import('../services/localDb')
    const source = localDb.saveActivity({
      description: '<p>Origem local</p>',
      status: 'Pendente',
      month_reference: '05/2026',
    })
    const onDuplicated = vi.fn()

    render(<DuplicateActivityModal activity={source} open onClose={() => {}} onDuplicated={onDuplicated} />)
    fireEvent.click(confirmButton())

    await waitFor(() => expect(onDuplicated).toHaveBeenCalled())
    const copy = onDuplicated.mock.calls[0][0] as ActivityData
    expect(copy.id).not.toBe(source.id)
    expect(copy.description).toBe('<p>Origem local</p>')
    expect(copy.month_reference).toBe('05/2026')
    localStorage.clear()
  })
})
