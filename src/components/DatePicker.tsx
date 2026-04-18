import { useState, useRef, useEffect, useCallback, type KeyboardEvent } from 'react'

interface DatePickerProps {
  id?: string
  name?: string
  value: string            // 'YYYY-MM-DD' or ''
  onChange: (value: string) => void
  className?: string
  placeholder?: string
  hasError?: boolean
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay()
}

function formatDisplay(iso: string): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function toISO(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function DatePicker({
  id,
  name,
  value,
  onChange,
  className = '',
  placeholder = 'dd/mm/aaaa',
  hasError = false,
}: DatePickerProps) {
  const today = new Date()
  const parsed = value ? new Date(value + 'T00:00:00') : null

  const [open, setOpen] = useState(false)
  const [viewYear, setViewYear] = useState(parsed?.getFullYear() ?? today.getFullYear())
  const [viewMonth, setViewMonth] = useState(parsed?.getMonth() ?? today.getMonth())
  const [focusedDay, setFocusedDay] = useState<number | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const calendarRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  // Sync view to selected value when opened
  useEffect(() => {
    if (open && parsed) {
      setViewYear(parsed.getFullYear())
      setViewMonth(parsed.getMonth())
      setFocusedDay(parsed.getDate())
    } else if (open && !parsed) {
      setViewYear(today.getFullYear())
      setViewMonth(today.getMonth())
      setFocusedDay(today.getDate())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Position calendar dropdown
  const [dropUp, setDropUp] = useState(false)
  useEffect(() => {
    if (open && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      setDropUp(spaceBelow < 340)
    }
  }, [open])

  const selectDate = useCallback((day: number) => {
    onChange(toISO(viewYear, viewMonth, day))
    setOpen(false)
  }, [onChange, viewYear, viewMonth])

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear((y) => y - 1)
    } else {
      setViewMonth((m) => m - 1)
    }
    setFocusedDay(1)
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear((y) => y + 1)
    } else {
      setViewMonth((m) => m + 1)
    }
    setFocusedDay(1)
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault()
        setOpen(true)
      }
      return
    }

    const daysInMonth = getDaysInMonth(viewYear, viewMonth)
    let day = focusedDay ?? 1

    switch (e.key) {
      case 'Escape':
        e.preventDefault()
        setOpen(false)
        break
      case 'ArrowLeft':
        e.preventDefault()
        if (day > 1) setFocusedDay(day - 1)
        else prevMonth()
        break
      case 'ArrowRight':
        e.preventDefault()
        if (day < daysInMonth) setFocusedDay(day + 1)
        else nextMonth()
        break
      case 'ArrowUp':
        e.preventDefault()
        if (day > 7) setFocusedDay(day - 7)
        else prevMonth()
        break
      case 'ArrowDown':
        e.preventDefault()
        if (day + 7 <= daysInMonth) setFocusedDay(day + 7)
        else nextMonth()
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        if (focusedDay) selectDate(focusedDay)
        break
    }
  }

  // Build calendar grid
  const daysInMonth = getDaysInMonth(viewYear, viewMonth)
  const firstDay = getFirstDayOfWeek(viewYear, viewMonth)
  const cells: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  // Fill remaining cells to complete the grid
  while (cells.length % 7 !== 0) cells.push(null)

  const selectedDay = parsed && parsed.getFullYear() === viewYear && parsed.getMonth() === viewMonth
    ? parsed.getDate() : null
  const isToday = (day: number) =>
    day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear()

  const inputBaseClass = hasError
    ? 'cyber-input cyber-input-error w-full px-3 py-2 bg-card text-foreground border border-destructive rounded-lg focus:outline-none focus:ring-2 focus:ring-destructive transition-colors'
    : 'cyber-input w-full px-3 py-2 bg-card text-foreground border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring transition-colors'

  return (
    <div ref={containerRef} className="datepicker-container w-full" style={{ position: 'relative' }}>
      {/* Hidden input for form compat */}
      {name && <input type="hidden" name={name} value={value} />}

      {/* Trigger button */}
      <button
        id={id}
        type="button"
        onClick={() => setOpen(!open)}
        onKeyDown={handleKeyDown}
        className={`${inputBaseClass} flex items-center justify-between text-left ${className}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={placeholder}
      >
        <span className={value ? '' : 'text-muted-foreground'}>
          {value ? formatDisplay(value) : placeholder}
        </span>
        <i className="fa-regular fa-calendar text-muted-foreground" aria-hidden="true" />
      </button>

      {/* Calendar dropdown */}
      {open && (
        <div
          ref={calendarRef}
          className="datepicker-calendar w-72 bg-popover text-popover-foreground border border-border rounded-lg shadow-lg"
          style={{
            position: 'absolute',
            zIndex: 50,
            left: 0,
            ...(dropUp
              ? { bottom: '100%', marginBottom: '4px' }
              : { top: '100%', marginTop: '4px' }),
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Calendário"
          onKeyDown={handleKeyDown}
        >
          {/* Header: month/year nav */}
          <div className="datepicker-header flex items-center justify-between px-3 py-2 border-b border-border">
            <button
              type="button"
              onClick={prevMonth}
              className="datepicker-nav-btn p-1 rounded hover:bg-surface-hover text-foreground transition-colors"
              aria-label="Mês anterior"
            >
              <i className="fa-solid fa-chevron-left text-xs" />
            </button>
            <span className="datepicker-title text-sm font-semibold select-none">
              {MONTHS[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="datepicker-nav-btn p-1 rounded hover:bg-surface-hover text-foreground transition-colors"
              aria-label="Próximo mês"
            >
              <i className="fa-solid fa-chevron-right text-xs" />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="datepicker-weekdays grid grid-cols-7 px-2 pt-2">
            {WEEKDAYS.map((wd) => (
              <div key={wd} className="text-center text-[10px] font-medium text-muted-foreground uppercase pb-1">
                {wd}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div ref={gridRef} className="datepicker-grid grid grid-cols-7 gap-px px-2 pb-2" role="grid">
            {cells.map((day, i) => {
              if (day === null) {
                return <div key={`e-${i}`} className="w-9 h-8" />
              }

              const selected = day === selectedDay
              const focused = day === focusedDay
              const todayMark = isToday(day)

              let dayClass = 'datepicker-day w-9 h-8 flex items-center justify-center text-sm rounded transition-colors '
              if (selected) {
                dayClass += 'datepicker-day-selected bg-primary text-primary-foreground font-bold '
              } else if (todayMark) {
                dayClass += 'datepicker-day-today bg-accent/15 text-accent font-semibold '
              } else {
                dayClass += 'text-foreground hover:bg-surface-hover '
              }
              if (focused && !selected) {
                dayClass += 'ring-1 ring-ring '
              }

              return (
                <button
                  key={day}
                  type="button"
                  role="gridcell"
                  tabIndex={focused ? 0 : -1}
                  aria-selected={selected}
                  aria-current={todayMark ? 'date' : undefined}
                  className={dayClass}
                  onClick={() => selectDate(day)}
                >
                  {day}
                </button>
              )
            })}
          </div>

          {/* Footer: today shortcut */}
          <div className="datepicker-footer border-t border-border px-3 py-1.5 flex justify-between items-center">
            <button
              type="button"
              className="datepicker-today-btn text-xs text-accent hover:text-accent/80 font-medium transition-colors"
              onClick={() => selectDate(today.getDate())}
            >
              Hoje
            </button>
            {value && (
              <button
                type="button"
                className="datepicker-clear-btn text-xs text-muted-foreground hover:text-destructive transition-colors"
                onClick={() => { onChange(''); setOpen(false) }}
              >
                Limpar
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
