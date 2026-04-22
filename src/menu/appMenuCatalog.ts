export type AppMenuSectionId = 'file' | 'edit' | 'view' | 'help'

export type AppMenuCommandId =
  | 'file.new-activity'
  | 'file.open-reports-folder'
  | 'file.open-evidences-folder'
  | 'file.save-context'
  | 'file.settings'
  | 'file.quit'
  | 'edit.undo'
  | 'edit.redo'
  | 'edit.cut'
  | 'edit.copy'
  | 'edit.paste'
  | 'edit.select-all'
  | 'edit.focus-search'
  | 'view.zoom-in'
  | 'view.zoom-out'
  | 'view.zoom-reset'
  | 'view.window-minimize'
  | 'view.window-maximize'
  | 'view.window-close'
  | 'help.about'
  | 'help.check-updates'
  | 'help.user-manual'
  | 'help.report-issue'

export interface AppMenuSection {
  id: AppMenuSectionId
  label: string
}

export interface AppMenuCommand {
  id: AppMenuCommandId
  section: AppMenuSectionId
  label: string
  group: number
  shortcut?: string
  alternateShortcuts?: string[]
  globalShortcut?: boolean
  requiresElectron?: boolean
}

export const APP_MENU_SECTIONS: AppMenuSection[] = [
  { id: 'file', label: 'File' },
  { id: 'edit', label: 'Edit' },
  { id: 'view', label: 'View' },
  { id: 'help', label: 'Help' },
]

export const APP_MENU_COMMANDS: AppMenuCommand[] = [
  { id: 'file.new-activity', section: 'file', label: 'Nova Atividade', group: 0, shortcut: 'Mod+N', globalShortcut: true },
  { id: 'file.open-reports-folder', section: 'file', label: 'Abrir Pasta dos Relatórios', group: 1, shortcut: 'Mod+O', globalShortcut: true, requiresElectron: true },
  { id: 'file.open-evidences-folder', section: 'file', label: 'Abrir Pasta das Evidências', group: 1, shortcut: 'Mod+E', globalShortcut: true, requiresElectron: true },
  { id: 'file.save-context', section: 'file', label: 'Salvar', group: 2, shortcut: 'Mod+S', globalShortcut: true },
  { id: 'file.settings', section: 'file', label: 'Configurações', group: 3, shortcut: 'Mod+Comma', globalShortcut: true },
  { id: 'file.quit', section: 'file', label: 'Sair', group: 4, shortcut: 'Mod+Q', globalShortcut: true, requiresElectron: true },

  { id: 'edit.undo', section: 'edit', label: 'Desfazer', group: 0, shortcut: 'Mod+Z', requiresElectron: true },
  { id: 'edit.redo', section: 'edit', label: 'Refazer', group: 0, shortcut: 'Mod+Y', alternateShortcuts: ['Mod+Shift+Z'], requiresElectron: true },
  { id: 'edit.cut', section: 'edit', label: 'Recortar', group: 1, shortcut: 'Mod+X', requiresElectron: true },
  { id: 'edit.copy', section: 'edit', label: 'Copiar', group: 1, shortcut: 'Mod+C', requiresElectron: true },
  { id: 'edit.paste', section: 'edit', label: 'Colar', group: 1, shortcut: 'Mod+V', requiresElectron: true },
  { id: 'edit.select-all', section: 'edit', label: 'Selecionar Tudo', group: 1, shortcut: 'Mod+A', requiresElectron: true },
  { id: 'edit.focus-search', section: 'edit', label: 'Buscar', group: 2, shortcut: 'Mod+F', globalShortcut: true },

  { id: 'view.zoom-in', section: 'view', label: 'Zoom In', group: 0, shortcut: 'Mod+Plus', alternateShortcuts: ['Mod+Equals'], globalShortcut: true, requiresElectron: true },
  { id: 'view.zoom-out', section: 'view', label: 'Zoom Out', group: 0, shortcut: 'Mod+Minus', globalShortcut: true, requiresElectron: true },
  { id: 'view.zoom-reset', section: 'view', label: 'Zoom Reset', group: 0, shortcut: 'Mod+0', globalShortcut: true, requiresElectron: true },
  { id: 'view.window-minimize', section: 'view', label: 'Minimizar Janela', group: 1, requiresElectron: true },
  { id: 'view.window-maximize', section: 'view', label: 'Maximizar/Restaurar Janela', group: 1, requiresElectron: true },
  { id: 'view.window-close', section: 'view', label: 'Fechar Janela', group: 1, requiresElectron: true },

  { id: 'help.about', section: 'help', label: 'Sobre o ShipIt!', group: 0 },
  { id: 'help.check-updates', section: 'help', label: 'Verificar Atualizações', group: 0, requiresElectron: true },
  { id: 'help.user-manual', section: 'help', label: 'Manual do Usuário', group: 1 },
  { id: 'help.report-issue', section: 'help', label: 'Reportar um Problema', group: 1 },
]

const COMMANDS_BY_ID = new Map(APP_MENU_COMMANDS.map((command) => [command.id, command]))

export interface ShortcutEventLike {
  key: string
  ctrlKey?: boolean
  metaKey?: boolean
  altKey?: boolean
  shiftKey?: boolean
}

function isModifierToken(token: string): boolean {
  return token === 'mod' || token === 'alt' || token === 'shift'
}

function normalizeToken(token: string): string {
  const lower = token.trim().toLowerCase()

  if (lower === 'cmd' || lower === 'command' || lower === 'ctrl' || lower === 'control' || lower === 'meta') {
    return 'mod'
  }
  if (lower === 'option') return 'alt'
  if (lower === 'escape' || lower === 'esc') return 'escape'
  if (lower === 'arrowup') return 'up'
  if (lower === 'arrowdown') return 'down'
  if (lower === 'arrowleft') return 'left'
  if (lower === 'arrowright') return 'right'
  if (lower === ',') return 'comma'
  if (lower === '=') return 'equals'
  if (lower === '+') return 'plus'
  if (lower === '-') return 'minus'
  if (lower === 'subtract') return 'minus'
  if (lower === 'add') return 'plus'

  return lower
}

function normalizeEventKey(key: string): string {
  return normalizeToken(key)
}

export function normalizeShortcut(shortcut: string): string {
  const rawTokens = shortcut
    .split('+')
    .map((token) => token.trim())
    .filter((token) => token.length > 0)

  if (rawTokens.length === 0) return ''

  const normalizedTokens = rawTokens.map(normalizeToken)

  const hasMod = normalizedTokens.includes('mod')
  const hasAlt = normalizedTokens.includes('alt')
  const hasShift = normalizedTokens.includes('shift')
  const keyToken = normalizedTokens.find((token) => !isModifierToken(token)) ?? ''

  const ordered: string[] = []
  if (hasMod) ordered.push('mod')
  if (hasAlt) ordered.push('alt')
  if (hasShift) ordered.push('shift')
  if (keyToken) ordered.push(keyToken)

  return ordered.join('+')
}

export function eventToShortcut(event: ShortcutEventLike): string {
  let keyToken = normalizeEventKey(event.key)
  const hasMod = Boolean(event.ctrlKey || event.metaKey)

  if (hasMod && (keyToken === 'plus' || keyToken === 'equals')) {
    keyToken = 'plus'
  }

  const shouldIgnoreShift = hasMod && (keyToken === 'plus' || keyToken === 'minus')

  const tokens: string[] = []
  if (hasMod) tokens.push('mod')
  if (event.altKey) tokens.push('alt')
  if (event.shiftKey && !shouldIgnoreShift) tokens.push('shift')
  tokens.push(keyToken)

  return tokens.join('+')
}

function listCommandShortcuts(command: AppMenuCommand): string[] {
  const shortcuts = [command.shortcut, ...(command.alternateShortcuts ?? [])]
    .filter((shortcut): shortcut is string => Boolean(shortcut))

  return shortcuts.map(normalizeShortcut)
}

export function commandMatchesShortcut(command: AppMenuCommand, event: ShortcutEventLike): boolean {
  const eventShortcut = eventToShortcut(event)
  if (!eventShortcut) return false

  return listCommandShortcuts(command).includes(eventShortcut)
}

export function findCommandByShortcut(event: ShortcutEventLike): AppMenuCommand | null {
  return APP_MENU_COMMANDS.find((command) => commandMatchesShortcut(command, event)) ?? null
}

export function getMenuSectionCommands(sectionId: AppMenuSectionId): AppMenuCommand[] {
  return APP_MENU_COMMANDS.filter((command) => command.section === sectionId)
}

export function getMenuCommand(commandId: AppMenuCommandId): AppMenuCommand {
  const command = COMMANDS_BY_ID.get(commandId)
  if (!command) {
    throw new Error(`Comando de menu não encontrado: ${commandId}`)
  }
  return command
}

function isMacPlatform(): boolean {
  if (typeof navigator === 'undefined') return false
  return /Mac|iPhone|iPad|iPod/i.test(navigator.platform)
}

export function formatShortcutLabel(shortcut: string, forceMacPlatform?: boolean): string {
  const useMacLabel = forceMacPlatform ?? isMacPlatform()
  const normalized = normalizeShortcut(shortcut)
  if (!normalized) return ''

  const tokens = normalized.split('+')

  return tokens
    .map((token) => {
      switch (token) {
        case 'mod':
          return useMacLabel ? 'Cmd' : 'Ctrl'
        case 'alt':
          return useMacLabel ? 'Option' : 'Alt'
        case 'shift':
          return 'Shift'
        case 'comma':
          return ','
        case 'plus':
          return '+'
        case 'minus':
          return '-'
        case 'equals':
          return '='
        default:
          return token.length === 1 ? token.toUpperCase() : token
      }
    })
    .join('+')
}
