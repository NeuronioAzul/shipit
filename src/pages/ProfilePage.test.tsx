// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { __resetSaveContextRegistryForTests, runSaveContext } from '../menu/saveContextRegistry'
import { ProfilePage } from './ProfilePage'

const { navigateMock, toastSuccessMock, toastErrorMock } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')

  return {
    ...actual,
    useNavigate: () => navigateMock,
  }
})

vi.mock('sonner', () => ({
  toast: {
    success: toastSuccessMock,
    error: toastErrorMock,
  },
}))

vi.mock('../components/Select', () => ({
  Select: ({ id, name, value, onChange, options, hasError }: {
    id?: string
    name?: string
    value: string
    onChange: (value: string) => void
    options: Array<{ value: string; label: string }>
    hasError?: boolean
  }) => (
    <select
      id={id}
      name={name}
      value={value}
      data-has-error={hasError ? 'true' : 'false'}
      onChange={(event) => onChange(event.target.value)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
}))

interface MockElectronAPI {
  getUserProfile: ReturnType<typeof vi.fn>
  saveUserProfile: ReturnType<typeof vi.fn>
}

function setElectronAPI(api: Partial<MockElectronAPI> | null = {}) {
  const electronAPI = api === null
    ? undefined
    : {
        getUserProfile: vi.fn().mockResolvedValue(null),
        saveUserProfile: vi.fn().mockResolvedValue(undefined),
        ...api,
      }

  Object.defineProperty(window, 'electronAPI', {
    configurable: true,
    writable: true,
    value: electronAPI,
  })

  return electronAPI
}

function renderProfilePage() {
  return render(<ProfilePage />)
}

function fillRequiredProfileFields() {
  fireEvent.change(screen.getByLabelText(/Nome Completo/i), { target: { value: 'Maria Silva' } })
  fireEvent.change(screen.getByLabelText(/^Cargo/i), { target: { value: 'ENGENHEIRO DE SOFTWARE' } })
  fireEvent.change(screen.getByLabelText(/Senioridade/i), { target: { value: 'Pleno' } })
  fireEvent.change(screen.getByLabelText(/Identificador do Contrato/i), { target: { value: 'CT-001' } })
  fireEvent.change(screen.getByLabelText(/Tipo de Perfil/i), { target: { value: 'DEV-03' } })
  fireEvent.change(screen.getByLabelText(/Tipo de Atendimento/i), { target: { value: 'Remoto' } })
  fireEvent.change(screen.getByLabelText(/Escopo:/i), { target: { value: 'Squad Alpha' } })
  fireEvent.change(screen.getByLabelText(/Atividades Correlatas/i), {
    target: { value: 'Desenvolvimento de software e sustentação.' },
  })
  fireEvent.change(screen.getByLabelText(/Disponibilidade Diária/i), { target: { value: '8' } })
  fireEvent.change(screen.getByLabelText(/Disponibilidade Mensal/i), { target: { value: '168' } })
  fireEvent.change(screen.getByLabelText(/Esforço Mínimo em Horas/i), { target: { value: '40' } })
}

function triggerProfileNavigationTimeout(setTimeoutSpy: ReturnType<typeof vi.spyOn>) {
  const timeoutIndex = setTimeoutSpy.mock.calls.findLastIndex((call) => call[1] === 800)
  expect(timeoutIndex).toBeGreaterThanOrEqual(0)

  const timeoutCallback = setTimeoutSpy.mock.calls[timeoutIndex]?.[0]
  const timeoutHandle = setTimeoutSpy.mock.results[timeoutIndex]?.value as ReturnType<typeof setTimeout>

  clearTimeout(timeoutHandle)

  if (typeof timeoutCallback === 'function') {
    timeoutCallback()
  }
}

describe('ProfilePage', () => {
  beforeEach(() => {
    navigateMock.mockReset()
    toastSuccessMock.mockReset()
    toastErrorMock.mockReset()
    localStorage.clear()
    __resetSaveContextRegistryForTests()
  })

  afterEach(() => {
    cleanup()
    setElectronAPI(null)
    __resetSaveContextRegistryForTests()
    vi.restoreAllMocks()
  })

  it('loads an existing profile from electronAPI and shows edit mode', async () => {
    const electronAPI = setElectronAPI({
      getUserProfile: vi.fn().mockResolvedValue({
        full_name: 'MARIA SILVA',
        role: 'ENGENHEIRO DE SOFTWARE',
        seniority_level: 'Pleno',
        contract_identifier: 'CT-001',
        profile_type: 'DEV-03',
        correlating_activities: 'Desenvolvimento de software',
        attendance_type: 'Remoto',
        project_scope: 'Squad Alpha',
        daily_availability: 8,
        monthly_availability: 168,
        minimum_effort_hours: 40,
      }),
    })

    renderProfilePage()

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Editar Perfil' })).toBeTruthy()
    })

    expect((screen.getByLabelText(/Nome Completo/i) as HTMLInputElement).value).toBe('MARIA SILVA')
    expect((screen.getByLabelText(/Disponibilidade Diária/i) as HTMLInputElement).value).toBe('8')
    expect((screen.getByLabelText(/Disponibilidade Mensal/i) as HTMLInputElement).value).toBe('168')
    expect((screen.getByLabelText(/Esforço Mínimo em Horas/i) as HTMLInputElement).value).toBe('40')
    expect(electronAPI?.getUserProfile).toHaveBeenCalledTimes(1)
  })

  it('submits numeric availability fields through electronAPI', async () => {
    const electronAPI = setElectronAPI()
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout')

    renderProfilePage()
    fillRequiredProfileFields()

    fireEvent.click(screen.getByRole('button', { name: /Criar Perfil/i }))

    await waitFor(() => {
      expect(electronAPI?.saveUserProfile).toHaveBeenCalledTimes(1)
    })

    expect(electronAPI?.saveUserProfile).toHaveBeenCalledWith({
      full_name: 'MARIA SILVA',
      role: 'ENGENHEIRO DE SOFTWARE',
      seniority_level: 'Pleno',
      contract_identifier: 'CT-001',
      profile_type: 'DEV-03',
      correlating_activities: 'Desenvolvimento de software e sustentação.',
      attendance_type: 'Remoto',
      project_scope: 'Squad Alpha',
      daily_availability: 8,
      monthly_availability: 168,
      minimum_effort_hours: 40,
    })
    expect(toastSuccessMock).toHaveBeenCalledWith('Perfil salvo com sucesso!')
    triggerProfileNavigationTimeout(setTimeoutSpy)
    expect(navigateMock).toHaveBeenCalledWith('/')

    setTimeoutSpy.mockRestore()
  })

  it('saves through the registered save-context handler after form changes', async () => {
    const electronAPI = setElectronAPI()

    renderProfilePage()
    fillRequiredProfileFields()

    let result: Awaited<ReturnType<typeof runSaveContext>>

    await act(async () => {
      result = await runSaveContext()
    })

    expect(result!).toEqual({ status: 'saved', message: 'Perfil salvo com sucesso.' })
    expect(electronAPI?.saveUserProfile).toHaveBeenCalledWith(expect.objectContaining({
      daily_availability: 8,
      monthly_availability: 168,
      minimum_effort_hours: 40,
    }))
  })

  it('shows validation errors and blocks saving when required fields are missing', async () => {
    const electronAPI = setElectronAPI()

    renderProfilePage()

    fireEvent.submit(document.getElementById('profile-form') as HTMLFormElement)

    await waitFor(() => {
      expect(screen.getAllByText('Disponibilidade diária é obrigatória').length).toBeGreaterThan(0)
    })

    expect(screen.getAllByText('Disponibilidade mensal é obrigatória').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Esforço mínimo em horas é obrigatória').length).toBeGreaterThan(0)
    expect(electronAPI?.saveUserProfile).not.toHaveBeenCalled()
    expect(toastErrorMock).not.toHaveBeenCalled()
  })

  it('loads and saves the profile through localStorage fallback', async () => {
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout')

    setElectronAPI(null)
    localStorage.setItem('shipit-profile', JSON.stringify({
      full_name: 'MARIA SILVA',
      role: 'ENGENHEIRO DE SOFTWARE',
      seniority_level: 'Pleno',
      contract_identifier: 'CT-001',
      profile_type: 'DEV-03',
      correlating_activities: 'Desenvolvimento de software',
      attendance_type: 'Remoto',
      project_scope: 'Squad Alpha',
      daily_availability: 8,
      monthly_availability: 168,
      minimum_effort_hours: 40,
    }))

    renderProfilePage()

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Editar Perfil' })).toBeTruthy()
    })

    fireEvent.change(screen.getByLabelText(/Disponibilidade Mensal/i), { target: { value: '200' } })
    fireEvent.click(screen.getByRole('button', { name: /Salvar Alterações/i }))

    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem('shipit-profile') || '{}')
      expect(stored.monthly_availability).toBe(200)
    })

    const stored = JSON.parse(localStorage.getItem('shipit-profile') || '{}')
    expect(stored.daily_availability).toBe(8)
    expect(stored.minimum_effort_hours).toBe(40)
    expect(toastSuccessMock).toHaveBeenCalledWith('Perfil salvo com sucesso!')
    triggerProfileNavigationTimeout(setTimeoutSpy)
    expect(navigateMock).toHaveBeenCalledWith('/')

    setTimeoutSpy.mockRestore()
  })
})