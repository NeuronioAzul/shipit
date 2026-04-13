import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ActivityData } from '../vite-env'
import { localDb } from '../services/localDb'

const STATUS_COLORS: Record<string, string> = {
  'Em andamento': 'bg-brand-blue/15 text-primary',
  'Concluído': 'bg-success/15 text-success',
  'Cancelado': 'bg-destructive/15 text-destructive',
  'Pendente': 'bg-warning/15 text-warning-foreground',
}

export function SearchBar() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ActivityData[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Keyboard shortcut Ctrl+K / Cmd+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        setIsOpen(true)
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
        inputRef.current?.blur()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      let data: ActivityData[]
      if (window.electronAPI) {
        data = await window.electronAPI.searchActivities(q.trim())
      } else {
        // Browser fallback: search in localStorage
        const all = localDb.getActivities('')
        const lower = q.toLowerCase()
        data = all.filter(a =>
          a.description?.toLowerCase().includes(lower) ||
          a.project_scope?.toLowerCase().includes(lower) ||
          a.link_ref?.toLowerCase().includes(lower)
        )
      }
      setResults(data.slice(0, 10))
    } finally {
      setLoading(false)
    }
  }, [])

  function handleInputChange(value: string) {
    setQuery(value)
    setSelectedIndex(-1)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(value), 300)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => Math.min(prev + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => Math.max(prev - 1, -1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (selectedIndex >= 0 && results[selectedIndex]) {
        navigateToResult(results[selectedIndex])
      } else if (query.trim()) {
        navigateToFilter()
      }
    }
  }

  function navigateToResult(activity: ActivityData) {
    setIsOpen(false)
    setQuery('')
    setResults([])
    navigate(`/activities/${activity.id}`)
  }

  function navigateToFilter() {
    setIsOpen(false)
    const q = query.trim()
    setQuery('')
    setResults([])
    navigate(`/activities?search=${encodeURIComponent(q)}`)
  }

  function highlightMatch(text: string | null): React.ReactNode {
    if (!text || !query.trim()) return text || ''
    const lower = text.toLowerCase()
    const idx = lower.indexOf(query.toLowerCase())
    if (idx === -1) return text
    return (
      <>
        {text.slice(0, idx)}
        <mark className="bg-accent/30 text-foreground rounded-sm px-0.5">{text.slice(idx, idx + query.length)}</mark>
        {text.slice(idx + query.length)}
      </>
    )
  }

  return (
    <div ref={containerRef} className="relative flex-1 max-w-md mx-4">
      <div className="relative">
        <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 text-xs pointer-events-none"></i>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Buscar atividades... (Ctrl+K)"
          className="w-full pl-8 pr-3 py-1.5 text-sm bg-titlebar-search text-titlebar-foreground placeholder:text-muted-foreground/50 border border-border/30 rounded-md focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-colors"
        />
        {loading && (
          <i className="fa-solid fa-spinner fa-spin absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 text-xs"></i>
        )}
      </div>

      {/* Results dropdown */}
      {isOpen && (query.trim().length >= 2) && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-2xl z-50 max-h-80 overflow-y-auto">
          {results.length === 0 && !loading && (
            <div className="px-4 py-3 text-sm text-muted-foreground text-center">
              Nenhuma atividade encontrada.
            </div>
          )}
          {results.map((activity, idx) => (
            <button
              key={activity.id}
              onClick={() => navigateToResult(activity)}
              className={`w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer border-b border-border/30 last:border-b-0 ${
                idx === selectedIndex ? 'bg-muted/50' : ''
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-muted-foreground font-medium">
                  {activity.month_reference}
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${STATUS_COLORS[activity.status] || ''}`}>
                  {activity.status}
                </span>
                {activity.evidences && activity.evidences.length > 0 && activity.evidences.some(e =>
                  e.caption?.toLowerCase().includes(query.toLowerCase())
                ) && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent/10 text-accent font-medium">
                    <i className="fa-solid fa-image mr-0.5"></i> evidência
                  </span>
                )}
              </div>
              <p className="text-sm text-foreground line-clamp-1">
                {highlightMatch(activity.description)}
              </p>
              {activity.project_scope && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                  {highlightMatch(activity.project_scope)}
                </p>
              )}
            </button>
          ))}
          {query.trim().length >= 2 && results.length > 0 && (
            <button
              onClick={navigateToFilter}
              className="w-full text-center px-4 py-2.5 text-xs text-primary hover:bg-muted/50 transition-colors cursor-pointer font-medium"
            >
              <i className="fa-solid fa-filter mr-1"></i>
              Filtro avançado para "{query}"
            </button>
          )}
        </div>
      )}
    </div>
  )
}
