import { describe, expect, it } from 'vitest'
import {
  commandMatchesShortcut,
  eventToShortcut,
  findCommandByShortcut,
  formatShortcutLabel,
  getMenuSectionCommands,
  normalizeShortcut,
} from './appMenuCatalog'

describe('appMenuCatalog shortcut helpers', () => {
  it('normalizes shortcut tokens and modifiers', () => {
    expect(normalizeShortcut('Ctrl+N')).toBe('mod+n')
    expect(normalizeShortcut('Mod+Comma')).toBe('mod+comma')
    expect(normalizeShortcut('Mod+Shift+Z')).toBe('mod+shift+z')
  })

  it('normalizes keyboard events including zoom key variants', () => {
    expect(eventToShortcut({ key: '=', ctrlKey: true })).toBe('mod+plus')
    expect(eventToShortcut({ key: '+', ctrlKey: true, shiftKey: true })).toBe('mod+plus')
    expect(eventToShortcut({ key: '-', ctrlKey: true })).toBe('mod+minus')
  })

  it('finds commands by mapped shortcuts', () => {
    expect(findCommandByShortcut({ key: 'n', ctrlKey: true })?.id).toBe('file.new-activity')
    expect(findCommandByShortcut({ key: ',', ctrlKey: true })?.id).toBe('file.settings')
    expect(findCommandByShortcut({ key: 'z', ctrlKey: true, shiftKey: true })?.id).toBe('edit.redo')
    expect(findCommandByShortcut({ key: '0', ctrlKey: true })?.id).toBe('view.zoom-reset')
  })

  it('matches shortcuts against command metadata', () => {
    const saveCommand = getMenuSectionCommands('file').find((command) => command.id === 'file.save-context')
    expect(saveCommand).toBeTruthy()

    expect(commandMatchesShortcut(saveCommand!, { key: 's', ctrlKey: true })).toBe(true)
    expect(commandMatchesShortcut(saveCommand!, { key: 's', ctrlKey: true, shiftKey: true })).toBe(false)
  })

  it('formats shortcuts for windows and mac labels', () => {
    expect(formatShortcutLabel('Mod+Shift+Z', false)).toBe('Ctrl+Shift+Z')
    expect(formatShortcutLabel('Mod+Comma', true)).toBe('Cmd+,')
  })
})
