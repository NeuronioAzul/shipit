import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { UpdateCheckResult, UpdateStatusData } from '../vite-env'

const DEFAULT_UPDATE_STATUS: UpdateStatusData = {
  status: 'not-available',
  attentionVisible: false,
}

export const UPDATE_SETTINGS_ROUTE = '/settings?focus=update'

interface UpdateStateContextValue {
  isElectron: boolean
  updateStatus: UpdateStatusData
  checkForUpdate: () => Promise<UpdateCheckResult | null>
  downloadUpdate: () => Promise<UpdateStatusData | null>
  installUpdate: () => Promise<void>
  acknowledgeUpdateAttention: (version?: string) => Promise<UpdateStatusData | null>
}

const UpdateStateContext = createContext<UpdateStateContextValue | null>(null)

export function UpdateStateProvider({ children }: { children: ReactNode }) {
  const [updateStatus, setUpdateStatus] = useState<UpdateStatusData>(DEFAULT_UPDATE_STATUS)
  const isElectron = Boolean(window.electronAPI)

  useEffect(() => {
    if (!window.electronAPI) return

    const cleanup = window.electronAPI.onUpdateStatus((nextState) => {
      setUpdateStatus(nextState)
    })

    let isActive = true
    void window.electronAPI.getUpdateState().then((nextState) => {
      if (isActive) {
        setUpdateStatus(nextState)
      }
    }).catch(() => {})

    return () => {
      isActive = false
      cleanup()
    }
  }, [])

  async function checkForUpdate(): Promise<UpdateCheckResult | null> {
    if (!window.electronAPI) return null

    const nextState = await window.electronAPI.checkForUpdate()
    if (nextState.status !== 'already-checking') {
      setUpdateStatus({
        status: nextState.status,
        version: nextState.version,
        error: nextState.error,
        progress: nextState.progress,
        attentionVisible: nextState.attentionVisible,
      })
    }
    return nextState
  }

  async function downloadUpdate(): Promise<UpdateStatusData | null> {
    if (!window.electronAPI) return null

    const nextState = await window.electronAPI.downloadUpdate()
    setUpdateStatus(nextState)
    return nextState
  }

  async function installUpdate(): Promise<void> {
    if (!window.electronAPI) return
    await window.electronAPI.installUpdate()
  }

  async function acknowledgeUpdateAttention(version?: string): Promise<UpdateStatusData | null> {
    if (!window.electronAPI) return null

    const nextState = await window.electronAPI.acknowledgeUpdateAttention(version)
    setUpdateStatus(nextState)
    return nextState
  }

  return (
    <UpdateStateContext.Provider
      value={{
        isElectron,
        updateStatus,
        checkForUpdate,
        downloadUpdate,
        installUpdate,
        acknowledgeUpdateAttention,
      }}
    >
      {children}
    </UpdateStateContext.Provider>
  )
}

export function useUpdateState(): UpdateStateContextValue {
  const context = useContext(UpdateStateContext)
  if (!context) {
    throw new Error('useUpdateState must be used inside UpdateStateProvider.')
  }

  return context
}