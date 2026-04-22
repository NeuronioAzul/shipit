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
      let nextState = prev
      const pendingIndex = pendingTimeTravelIndexRef.current

      if (pendingIndex !== null) {
        pendingTimeTravelIndexRef.current = null

        if (prev.entries[pendingIndex] === nextEntry) {
          if (prev.index !== pendingIndex) {
            nextState = { ...prev, index: pendingIndex }
          }
        } else {
          const replaced = [...prev.entries]
          replaced[pendingIndex] = nextEntry
          nextState = { entries: replaced, index: pendingIndex }
        }
      } else {
        const currentEntry = prev.entries[prev.index]
        if (currentEntry !== nextEntry) {
          const truncated = prev.entries.slice(0, prev.index + 1)
          if (truncated[truncated.length - 1] === nextEntry) {
            nextState = { entries: truncated, index: truncated.length - 1 }
          } else {
            const appended = [...truncated, nextEntry]
            if (appended.length <= MAX_HISTORY_ENTRIES) {
              nextState = { entries: appended, index: appended.length - 1 }
            } else {
              const trimmed = appended.slice(appended.length - MAX_HISTORY_ENTRIES)
              nextState = { entries: trimmed, index: trimmed.length - 1 }
            }
          }
        }
      }

      stateRef.current = nextState
      return nextState
    })
  }, [location.pathname, location.search, location.hash])

  const goBack = useCallback(() => {
    const { entries, index } = stateRef.current
    if (index <= 0) return

    const targetIndex = index - 1
    pendingTimeTravelIndexRef.current = targetIndex
    navigate(entries[targetIndex])
  }, [navigate])

  const goForward = useCallback(() => {
    const { entries, index } = stateRef.current
    if (index >= entries.length - 1) return

    const targetIndex = index + 1
    pendingTimeTravelIndexRef.current = targetIndex
    navigate(entries[targetIndex])
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