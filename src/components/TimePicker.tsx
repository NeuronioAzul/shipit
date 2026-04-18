import { useState, useRef, useEffect, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'

interface TimePickerProps {
  id?: string
  name?: string
  value: string // 'HH:MM' or ''
  onChange: (value: string) => void
  className?: string
  placeholder?: string
  hasError?: boolean
}

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5) // 0, 5, 10, ..., 55

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

export function TimePicker({
  id,
  name,
  value,
  onChange,
  className = '',
  placeholder = 'HH:MM',
  hasError = false,
}: TimePickerProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const hourListRef = useRef<HTMLDivElement>(null)
  const minuteListRef = useRef<HTMLDivElement>(null)
  const [dropUp, setDropUp] = useState(false)
  const [pos, setPos] = useState({ triggerBottom: 0, triggerTop: 0, left: 0, width: 0 })
  const [focusCol, setFocusCol] = useState<'hour' | 'minute'>('hour')
  const [focusedHour, setFocusedHour] = useState(0)
  const [focusedMinIdx, setFocusedMinIdx] = useState(0)

  // Parse value
  const parsedHour = value ? parseInt(value.split(':')[0], 10) : -1
  const parsedMinute = value ? parseInt(value.split(':')[1], 10) : -1

  // Close on outside click (handles portal element)
  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node
      if (
        containerRef.current && !containerRef.current.contains(target) &&
        (!dropdownRef.current || !dropdownRef.current.contains(target))
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  // Position dropdown (portal: fixed to viewport)
  useEffect(() => {
    if (!open || !triggerRef.current) return
    function updatePos() {
      const rect = triggerRef.current!.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      setDropUp(spaceBelow < 300)
      setPos({ triggerBottom: rect.bottom, triggerTop: rect.top, left: rect.left, width: rect.width })
    }
    updatePos()
    window.addEventListener('scroll', updatePos, true)
    window.addEventListener('resize', updatePos)
    return () => {
      window.removeEventListener('scroll', updatePos, true)
      window.removeEventListener('resize', updatePos)
    }
  }, [open])

  // Scroll to selected on open + reset focus
  useEffect(() => {
    if (!open) return
    const h = parsedHour >= 0 ? parsedHour : 9
    const mIdx = parsedMinute >= 0 ? MINUTES.indexOf(parsedMinute) : 0
    setFocusedHour(h)
    setFocusedMinIdx(mIdx >= 0 ? mIdx : 0)
    setFocusCol('hour')
    requestAnimationFrame(() => {
      if (hourListRef.current) {
        const items = hourListRef.current.querySelectorAll('.timepicker-item')
        items[h]?.scrollIntoView({ block: 'center', behavior: 'instant' as ScrollBehavior })
      }
      if (minuteListRef.current) {
        const items = minuteListRef.current.querySelectorAll('.timepicker-item')
        const idx = mIdx >= 0 ? mIdx : 0
        items[idx]?.scrollIntoView({ block: 'center', behavior: 'instant' as ScrollBehavior })
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function selectTime(hour: number, minute: number) {
    onChange(`${pad(hour)}:${pad(minute)}`)
  }

  function setNow() {
    const now = new Date()
    const h = now.getHours()
    let m = Math.round(now.getMinutes() / 5) * 5
    if (m >= 60) m = 55
    selectTime(h, m)
    setOpen(false)
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault()
        setOpen(true)
      }
      return
    }
    switch (e.key) {
      case 'Escape':
        e.preventDefault()
        setOpen(false)
        break
      case 'ArrowLeft':
      case 'ArrowRight':
        e.preventDefault()
        setFocusCol((c) => (c === 'hour' ? 'minute' : 'hour'))
        break
      case 'ArrowUp':
        e.preventDefault()
        if (focusCol === 'hour') {
          setFocusedHour((h) => (h > 0 ? h - 1 : 23))
        } else {
          setFocusedMinIdx((m) => (m > 0 ? m - 1 : MINUTES.length - 1))
        }
        break
      case 'ArrowDown':
        e.preventDefault()
        if (focusCol === 'hour') {
          setFocusedHour((h) => (h < 23 ? h + 1 : 0))
        } else {
          setFocusedMinIdx((m) => (m < MINUTES.length - 1 ? m + 1 : 0))
        }
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        selectTime(focusedHour, MINUTES[focusedMinIdx])
        setOpen(false)
        break
    }
  }

  // Scroll focused items into view
  useEffect(() => {
    if (!open || focusCol !== 'hour' || !hourListRef.current) return
    const items = hourListRef.current.querySelectorAll('.timepicker-item')
    items[focusedHour]?.scrollIntoView({ block: 'nearest' })
  }, [open, focusedHour, focusCol])

  useEffect(() => {
    if (!open || focusCol !== 'minute' || !minuteListRef.current) return
    const items = minuteListRef.current.querySelectorAll('.timepicker-item')
    items[focusedMinIdx]?.scrollIntoView({ block: 'nearest' })
  }, [open, focusedMinIdx, focusCol])

  const inputBaseClass = hasError
    ? 'cyber-input cyber-input-error w-full px-3 py-2 bg-card text-foreground border border-destructive rounded-lg focus:outline-none focus:ring-2 focus:ring-destructive transition-colors'
    : 'cyber-input w-full px-3 py-2 bg-card text-foreground border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring transition-colors'

  const dropdown = open
    ? createPortal(
        <div
          ref={dropdownRef}
          className="timepicker-dropdown bg-popover text-popover-foreground border border-border rounded-lg shadow-lg"
          style={{
            position: 'fixed',
            zIndex: 9999,
            left: pos.left,
            width: Math.max(pos.width, 200),
            ...(dropUp
              ? { bottom: `${window.innerHeight - pos.triggerTop + 4}px` }
              : { top: `${pos.triggerBottom + 4}px` }),
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Seletor de horário"
          onKeyDown={handleKeyDown}
        >
          {/* Header */}
          <div className="timepicker-header flex items-center justify-between px-3 py-2 border-b border-border">
            <span className="timepicker-title text-sm font-semibold select-none">
              {pad(focusedHour)}:{pad(MINUTES[focusedMinIdx])}
            </span>
            <button
              type="button"
              onClick={setNow}
              className="timepicker-now-btn text-xs px-2 py-0.5 text-primary hover:bg-surface-hover rounded transition-colors"
            >
              Agora
            </button>
          </div>

          {/* Columns */}
          <div className="flex">
            {/* Hour column */}
            <div
              ref={hourListRef}
              className="timepicker-column flex-1 border-r border-border"
              style={{ maxHeight: '200px', overflowY: 'auto' }}
            >
              <div className="timepicker-column-label text-[10px] font-medium text-muted-foreground uppercase text-center py-1 sticky top-0 bg-popover/95 backdrop-blur-sm z-10 border-b border-border/50">
                Hora
              </div>
              {HOURS.map((h) => {
                const isSelected = h === parsedHour
                const isFocused = h === focusedHour && focusCol === 'hour'
                let cls =
                  'timepicker-item text-center py-1.5 text-sm cursor-pointer transition-colors '
                if (isSelected) cls += 'timepicker-item-selected bg-primary/10 text-primary font-semibold '
                if (isFocused && !isSelected) cls += 'bg-surface-hover '
                if (!isSelected && !isFocused) cls += 'hover:bg-surface-hover '
                return (
                  <div
                    key={h}
                    className={cls}
                    onClick={() => {
                      const m = parsedMinute >= 0 ? parsedMinute : MINUTES[focusedMinIdx]
                      selectTime(h, m)
                    }}
                    onMouseEnter={() => setFocusedHour(h)}
                  >
                    {pad(h)}
                  </div>
                )
              })}
            </div>

            {/* Minute column */}
            <div
              ref={minuteListRef}
              className="timepicker-column flex-1"
              style={{ maxHeight: '200px', overflowY: 'auto' }}
            >
              <div className="timepicker-column-label text-[10px] font-medium text-muted-foreground uppercase text-center py-1 sticky top-0 bg-popover/95 backdrop-blur-sm z-10 border-b border-border/50">
                Min
              </div>
              {MINUTES.map((m, idx) => {
                const isSelected = m === parsedMinute
                const isFocused = idx === focusedMinIdx && focusCol === 'minute'
                let cls =
                  'timepicker-item text-center py-1.5 text-sm cursor-pointer transition-colors '
                if (isSelected) cls += 'timepicker-item-selected bg-primary/10 text-primary font-semibold '
                if (isFocused && !isSelected) cls += 'bg-surface-hover '
                if (!isSelected && !isFocused) cls += 'hover:bg-surface-hover '
                return (
                  <div
                    key={m}
                    className={cls}
                    onClick={() => {
                      const h = parsedHour >= 0 ? parsedHour : focusedHour
                      selectTime(h, m)
                    }}
                    onMouseEnter={() => setFocusedMinIdx(idx)}
                  >
                    {pad(m)}
                  </div>
                )
              })}
            </div>
          </div>
        </div>,
        document.body,
      )
    : null

  return (
    <div ref={containerRef} className={`timepicker-container ${className}`}>
      {name && <input type="hidden" name={name} value={value} />}
      <button
        ref={triggerRef}
        id={id}
        type="button"
        onClick={() => setOpen(!open)}
        onKeyDown={handleKeyDown}
        className={`${inputBaseClass} flex items-center justify-between text-left ${className}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={placeholder}
      >
        <span className={value ? '' : 'text-muted-foreground'}>{value || placeholder}</span>
        <i className="fa-regular fa-clock text-muted-foreground" aria-hidden="true" />
      </button>
      {dropdown}
    </div>
  )
}
