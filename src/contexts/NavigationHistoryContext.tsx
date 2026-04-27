import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { isTypingTarget } from '../utils/keyboardGuards'

interface NavigationHistoryContextType {
  canGoBack: boolean
  canGoForward: boolean
  goBack: () => void
  goForward: () => void
}

interface HistoryState {
  entries: string[]
  index: number
}

interface RouteSnapshot {
  pathname: string
  search: string
  hash: string
}

// Keep a deep enough stack for practical navigation flows.
const MAX_HISTORY_ENTRIES = 100

const NavigationHistoryContext = createContext<NavigationHistoryContextType | undefined>(undefined)

function toHistoryEntry(route: RouteSnapshot): string {
  return `${route.pathname}${route.search}${route.hash}`
}

export function NavigationHistoryProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const initialStateRef = useRef<HistoryState>({
    entries: [toHistoryEntry(location)],
    index: 0,
  })
  const pendingTimeTravelIndexRef = useRef<number | null>(null)
  const [historyState, setHistoryState] = useState<HistoryState>(() => initialStateRef.current)
  const stateRef = useRef(initialStateRef.current)

  useEffect(() => {
    const nextEntry = toHistoryEntry(location)

    setHistoryState((prev) => {
      const pendingIndex = pendingTimeTravelIndexRef.current

      if (pendingIndex !== null) {
        pendingTimeTravelIndexRef.current = null

        if (pendingIndex >= 0 && pendingIndex < prev.entries.length && prev.entries[pendingIndex] === nextEntry) {
          if (prev.index === pendingIndex) {
            stateRef.current = prev
            return prev
          }

          const aligned = { ...prev, index: pendingIndex }
          stateRef.current = aligned
          return aligned
        }

        // If navigation landed in a different route than expected, rebuild from the target
        // index instead of replacing an existing entry, which keeps history depth intact.
        const baseIndex = pendingIndex >= 0 && pendingIndex < prev.entries.length
          ? pendingIndex
          : prev.index

        const baseEntries = prev.entries.slice(0, baseIndex + 1)
        let rebuiltEntries = baseEntries

        if (baseEntries[baseEntries.length - 1] !== nextEntry) {
          rebuiltEntries = [...baseEntries, nextEntry]
        }

        if (rebuiltEntries.length > MAX_HISTORY_ENTRIES) {
          rebuiltEntries = rebuiltEntries.slice(rebuiltEntries.length - MAX_HISTORY_ENTRIES)
        }

        const rebuilt = { entries: rebuiltEntries, index: rebuiltEntries.length - 1 }
        stateRef.current = rebuilt
        return rebuilt
      }

      const currentEntry = prev.entries[prev.index]
      if (currentEntry === nextEntry) {
        stateRef.current = prev
        return prev
      }

      let appended = [...prev.entries.slice(0, prev.index + 1), nextEntry]
      if (appended.length > MAX_HISTORY_ENTRIES) {
        appended = appended.slice(appended.length - MAX_HISTORY_ENTRIES)
      }

      const nextState = { entries: appended, index: appended.length - 1 }
      stateRef.current = nextState
      return nextState
    })
  }, [location.pathname, location.search, location.hash])

  const goBack = useCallback(() => {
    const { entries, index } = stateRef.current
    if (index <= 0) return

    const targetIndex = index - 1
    const targetEntry = entries[targetIndex]
    if (!targetEntry) return

    pendingTimeTravelIndexRef.current = targetIndex
    navigate(targetEntry)
  }, [navigate])

  const goForward = useCallback(() => {
    const { entries, index } = stateRef.current
    if (index >= entries.length - 1) return

    const targetIndex = index + 1
    const targetEntry = entries[targetIndex]
    if (!targetEntry) return

    pendingTimeTravelIndexRef.current = targetIndex
    navigate(targetEntry)
  }, [navigate])

  useEffect(() => {
    function handleGlobalNavigation(e: KeyboardEvent) {
      if (!e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return
      if (isTypingTarget(e.target)) return

      if (e.key === 'ArrowLeft') {
        if (stateRef.current.index <= 0) return
        e.preventDefault()
        goBack()
      }

      if (e.key === 'ArrowRight') {
        if (stateRef.current.index >= stateRef.current.entries.length - 1) return
        e.preventDefault()
        goForward()
      }
    }

    window.addEventListener('keydown', handleGlobalNavigation)
    return () => window.removeEventListener('keydown', handleGlobalNavigation)
  }, [goBack, goForward])

  const canGoBack = historyState.index > 0
  const canGoForward = historyState.index < historyState.entries.length - 1

  const value = useMemo(
    () => ({ canGoBack, canGoForward, goBack, goForward }),
    [canGoBack, canGoForward, goBack, goForward],
  )

  return (
    <NavigationHistoryContext.Provider value={value}>
      {children}
    </NavigationHistoryContext.Provider>
  )
}

export function useNavigationHistory() {
  const context = useContext(NavigationHistoryContext)
  if (!context) {
    throw new Error('useNavigationHistory must be used within a NavigationHistoryProvider')
  }
  return context
}