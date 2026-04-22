import { useEffect, useMemo, useRef, useState } from 'react'
import {
  APP_MENU_SECTIONS,
  formatShortcutLabel,
  getMenuSectionCommands,
  type AppMenuCommand,
  type AppMenuCommandId,
  type AppMenuSectionId,
} from '../menu/appMenuCatalog'

interface AppTopMenuProps {
  onCommand: (commandId: AppMenuCommandId) => void | Promise<void>
  isCommandDisabled?: (command: AppMenuCommand) => boolean
}

type CommandsBySection = Record<AppMenuSectionId, AppMenuCommand[]>

function getShortcutLabel(command: AppMenuCommand): string {
  const shortcuts = [command.shortcut, ...(command.alternateShortcuts ?? [])]
    .filter((shortcut): shortcut is string => Boolean(shortcut))

  return shortcuts.map((shortcut) => formatShortcutLabel(shortcut)).join(' / ')
}

export function AppTopMenu({ onCommand, isCommandDisabled }: AppTopMenuProps) {
  const [openSection, setOpenSection] = useState<AppMenuSectionId | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  const sectionIds = useMemo(() => APP_MENU_SECTIONS.map((section) => section.id), [])

  const commandsBySection = useMemo<CommandsBySection>(() => {
    return {
      file: getMenuSectionCommands('file'),
      edit: getMenuSectionCommands('edit'),
      view: getMenuSectionCommands('view'),
      help: getMenuSectionCommands('help'),
    }
  }, [])

  useEffect(() => {
    if (!openSection) return

    function handleOutsideClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpenSection(null)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
    }
  }, [openSection])

  useEffect(() => {
    if (!openSection) return

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpenSection(null)
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => {
      window.removeEventListener('keydown', handleEscape)
    }
  }, [openSection])

  function getSectionItemButtons(sectionId: AppMenuSectionId): HTMLButtonElement[] {
    if (!rootRef.current) return []
    const selector = `button[data-menu-item=\"true\"][data-menu-section=\"${sectionId}\"]`
    const buttons = Array.from(rootRef.current.querySelectorAll<HTMLButtonElement>(selector))
    return buttons.filter((button) => !button.disabled)
  }

  function focusSectionButton(sectionId: AppMenuSectionId) {
    rootRef.current?.querySelector<HTMLButtonElement>(`#titlebar-menu-btn-${sectionId}`)?.focus()
  }

  function focusFirstItem(sectionId: AppMenuSectionId) {
    const first = getSectionItemButtons(sectionId)[0]
    first?.focus()
  }

  function moveSection(sectionId: AppMenuSectionId, direction: 1 | -1): AppMenuSectionId {
    const currentIndex = sectionIds.indexOf(sectionId)
    const nextIndex = (currentIndex + direction + sectionIds.length) % sectionIds.length
    return sectionIds[nextIndex] as AppMenuSectionId
  }

  function runCommand(commandId: AppMenuCommandId) {
    setOpenSection(null)
    void onCommand(commandId)
  }

  function handleSectionKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, sectionId: AppMenuSectionId) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      setOpenSection((current) => (current === sectionId ? null : sectionId))
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setOpenSection(sectionId)
      requestAnimationFrame(() => focusFirstItem(sectionId))
      return
    }

    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault()
      const nextSection = moveSection(sectionId, event.key === 'ArrowRight' ? 1 : -1)
      setOpenSection(nextSection)
      requestAnimationFrame(() => focusSectionButton(nextSection))
      return
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      setOpenSection(null)
    }
  }

  function handleItemKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, sectionId: AppMenuSectionId) {
    const buttons = getSectionItemButtons(sectionId)
    if (buttons.length === 0) return

    const currentIndex = buttons.findIndex((button) => button === document.activeElement)

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const direction = event.key === 'ArrowDown' ? 1 : -1
      const nextIndex = (currentIndex + direction + buttons.length) % buttons.length
      buttons[nextIndex]?.focus()
      return
    }

    if (event.key === 'Home') {
      event.preventDefault()
      buttons[0]?.focus()
      return
    }

    if (event.key === 'End') {
      event.preventDefault()
      buttons[buttons.length - 1]?.focus()
      return
    }

    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault()
      const nextSection = moveSection(sectionId, event.key === 'ArrowRight' ? 1 : -1)
      setOpenSection(nextSection)
      requestAnimationFrame(() => focusFirstItem(nextSection))
      return
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      setOpenSection(null)
      focusSectionButton(sectionId)
      return
    }

    if (event.key === 'Tab') {
      setOpenSection(null)
    }
  }

  return (
    <div id="titlebar-menu" ref={rootRef} className="relative flex items-center gap-0.5">
      {APP_MENU_SECTIONS.map((section) => {
        const commands = commandsBySection[section.id]

        return (
          <div
            key={section.id}
            className="relative"
            onMouseEnter={() => {
              if (openSection) setOpenSection(section.id)
            }}
          >
            <button
              id={`titlebar-menu-btn-${section.id}`}
              type="button"
              className={`h-7 px-2.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                openSection === section.id
                  ? 'bg-white/15 text-titlebar-foreground'
                  : 'text-titlebar-foreground/80 hover:text-titlebar-foreground hover:bg-white/10'
              }`}
              onClick={() => setOpenSection((current) => (current === section.id ? null : section.id))}
              onKeyDown={(event) => handleSectionKeyDown(event, section.id)}
              aria-haspopup="menu"
              aria-expanded={openSection === section.id}
              aria-controls={`titlebar-menu-panel-${section.id}`}
            >
              {section.label}
            </button>

            {openSection === section.id && (
              <div
                id={`titlebar-menu-panel-${section.id}`}
                role="menu"
                aria-label={`Menu ${section.label}`}
                className="absolute left-0 top-full z-50 mt-1 min-w-64 rounded-lg border border-border bg-card p-1 shadow-2xl"
              >
                {commands.map((command, index) => {
                  const showDivider = index > 0 && commands[index - 1]?.group !== command.group
                  const shortcutLabel = getShortcutLabel(command)
                  const disabled = isCommandDisabled?.(command) ?? false

                  return (
                    <div key={command.id}>
                      {showDivider && <div className="my-1 border-t border-border/60" />}
                      <button
                        id={`titlebar-menu-item-${command.id.replace(/\./g, '-')}`}
                        type="button"
                        role="menuitem"
                        disabled={disabled}
                        data-menu-item="true"
                        data-menu-section={section.id}
                        onClick={() => runCommand(command.id)}
                        onKeyDown={(event) => handleItemKeyDown(event, section.id)}
                        className="w-full rounded-md px-2 py-1.5 text-left text-sm transition-colors flex items-center justify-between gap-4 disabled:cursor-not-allowed disabled:opacity-45 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <span className="text-foreground">{command.label}</span>
                        {shortcutLabel && (
                          <span className="text-[11px] text-muted-foreground">{shortcutLabel}</span>
                        )}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
