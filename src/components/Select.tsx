import { useState, useRef, useEffect, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'

export interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  id?: string
  name?: string
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  className?: string
  hasError?: boolean
  size?: 'default' | 'sm'
}

export function Select({
  id,
  name,
  value,
  onChange,
  options,
  placeholder = 'Selecione',
  className = '',
  hasError = false,
  size = 'default',
}: SelectProps) {
  const [open, setOpen] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const [dropUp, setDropUp] = useState(false)
  const [pos, setPos] = useState({ triggerBottom: 0, triggerTop: 0, left: 0, width: 0 })

  const selectedOption = options.find((o) => o.value === value)

  // Close on outside click (handles portal element)
  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node
      if (
        containerRef.current && !containerRef.current.contains(target) &&
        (!listRef.current || !listRef.current.contains(target))
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
      setDropUp(spaceBelow < 220)
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

  // Scroll focused item into view
  useEffect(() => {
    if (open && listRef.current && focusedIndex >= 0) {
      const items = listRef.current.querySelectorAll('[role="option"]')
      items[focusedIndex]?.scrollIntoView({ block: 'nearest' })
    }
  }, [open, focusedIndex])

  function handleOpen() {
    setOpen(true)
    // Focus on the selected item or first item
    const idx = options.findIndex((o) => o.value === value)
    setFocusedIndex(idx >= 0 ? idx : 0)
  }

  function selectOption(val: string) {
    onChange(val)
    setOpen(false)
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        handleOpen()
      }
      return
    }

    switch (e.key) {
      case 'Escape':
        e.preventDefault()
        setOpen(false)
        break
      case 'ArrowDown':
        e.preventDefault()
        setFocusedIndex((i) => Math.min(i + 1, options.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setFocusedIndex((i) => Math.max(i - 1, 0))
        break
      case 'Home':
        e.preventDefault()
        setFocusedIndex(0)
        break
      case 'End':
        e.preventDefault()
        setFocusedIndex(options.length - 1)
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        if (focusedIndex >= 0 && focusedIndex < options.length) {
          selectOption(options[focusedIndex].value)
        }
        break
      default:
        // Type-ahead: jump to first option starting with typed character
        if (e.key.length === 1) {
          const char = e.key.toLowerCase()
          const idx = options.findIndex((o) => o.label.toLowerCase().startsWith(char))
          if (idx >= 0) setFocusedIndex(idx)
        }
        break
    }
  }

  const sizeClasses = size === 'sm' ? 'px-3 py-1.5 text-sm' : 'px-3 py-2'

  const inputBaseClass = hasError
    ? `cyber-input cyber-input-error w-full ${sizeClasses} bg-card text-foreground border border-destructive rounded-lg focus:outline-none focus:ring-2 focus:ring-destructive transition-colors`
    : `cyber-input w-full ${sizeClasses} bg-card text-foreground border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring transition-colors`

  // For small selects in filter bars, use muted background
  const bgOverride = size === 'sm' ? 'bg-muted' : ''

  // Dropdown rendered via portal to escape parent clip-path/overflow constraints
  const dropdown = open ? createPortal(
    <div
      ref={listRef}
      className="select-dropdown bg-popover text-popover-foreground border border-border rounded-lg shadow-lg"
      style={{
        position: 'fixed',
        zIndex: 9999,
        left: pos.left,
        width: pos.width,
        maxHeight: '200px',
        overflowY: 'auto',
        ...(dropUp
          ? { bottom: `${window.innerHeight - pos.triggerTop + 4}px` }
          : { top: `${pos.triggerBottom + 4}px` }),
      }}
      role="listbox"
      aria-label={placeholder}
      onKeyDown={handleKeyDown}
    >
      {options.map((opt, i) => {
        const isSelected = opt.value === value
        const isFocused = i === focusedIndex

        let itemClass = 'select-option flex items-center gap-2 px-3 py-2 text-sm transition-colors cursor-pointer '
        if (isSelected) {
          itemClass += 'select-option-selected bg-primary/10 text-primary font-medium '
        }
        if (isFocused && !isSelected) {
          itemClass += 'bg-surface-hover '
        }
        if (!isSelected && !isFocused) {
          itemClass += 'hover:bg-surface-hover '
        }

        return (
          <div
            key={opt.value}
            role="option"
            aria-selected={isSelected}
            tabIndex={-1}
            className={itemClass}
            onClick={() => selectOption(opt.value)}
            onMouseEnter={() => setFocusedIndex(i)}
          >
            {isSelected && <i className="fa-solid fa-check text-xs text-primary" aria-hidden="true" />}
            <span>{opt.label}</span>
          </div>
        )
      })}
    </div>,
    document.body,
  ) : null

  return (
    <div ref={containerRef} className={`select-container w-full ${className}`}>
      {/* Hidden input for form compat */}
      {name && <input type="hidden" name={name} value={value} />}

      {/* Trigger button */}
      <button
        ref={triggerRef}
        id={id}
        type="button"
        onClick={() => (open ? setOpen(false) : handleOpen())}
        onKeyDown={handleKeyDown}
        className={`${inputBaseClass} ${bgOverride} flex items-center justify-between text-left`}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={placeholder}
      >
        <span className={selectedOption ? '' : 'text-muted-foreground'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <i
          className={`fa-solid fa-chevron-down text-muted-foreground text-xs transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {dropdown}
    </div>
  )
}
