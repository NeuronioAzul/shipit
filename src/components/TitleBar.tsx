import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { SearchBar } from './SearchBar'
import { AppTopMenu } from './AppTopMenu'
import { UpdateModal } from './UpdateModal'
import { useNavigationHistory } from '../contexts/NavigationHistoryContext'
import { useUpdateState } from '../contexts/UpdateStateContext'
import { type AppMenuCommand, type AppMenuCommandId, findCommandByShortcut } from '../menu/appMenuCatalog'
import { runSaveContext } from '../menu/saveContextRegistry'
import { isTypingTarget } from '../utils/keyboardGuards'

const REPORT_ISSUE_URL = 'https://github.com/NeuronioAzul/shipit/issues/new'

function focusSearchInput() {
  const searchInput = document.getElementById('searchbar-input') as HTMLInputElement | null
  searchInput?.focus()
  searchInput?.select()
}

export function TitleBar() {
  const navigate = useNavigate()
  const [isMaximized, setIsMaximized] = useState(false)
  const [showUpdateModal, setShowUpdateModal] = useState(false)
  const { canGoBack, canGoForward, goBack, goForward } = useNavigationHistory()
  const { checkForUpdate } = useUpdateState()

  useEffect(() => {
    // Get initial maximized state
    window.electronAPI?.windowIsMaximized().then(setIsMaximized)

    // Listen for maximize/unmaximize events
    const unsub = window.electronAPI?.onWindowMaximized(setIsMaximized)
    return () => unsub?.()
  }, [])

  const handleMinimize = useCallback(() => window.electronAPI?.windowMinimize(), [])
  const handleMaximize = useCallback(() => window.electronAPI?.windowMaximize(), [])
  const handleClose = useCallback(() => window.electronAPI?.windowClose(), [])
  const handleGoBack = useCallback(() => goBack(), [goBack])
  const handleGoForward = useCallback(() => goForward(), [goForward])

  const executeMenuCommand = useCallback(async (commandId: AppMenuCommandId) => {
    switch (commandId) {
      case 'file.new-activity':
        navigate('/activities/new')
        return
      case 'file.open-reports-folder': {
        const opened = await window.electronAPI?.openReportsDirectory?.()
        if (opened === false) {
          toast.error('Não foi possível abrir a pasta de relatórios.')
        }
        return
      }
      case 'file.open-evidences-folder': {
        const opened = await window.electronAPI?.openEvidencesDirectory?.()
        if (opened === false) {
          toast.error('Não foi possível abrir a pasta de evidências.')
        }
        return
      }
      case 'file.save-context': {
        const result = await runSaveContext()
        if (result.status === 'saved') {
          toast.success(result.message || 'Dados salvos com sucesso.')
        } else if (result.status === 'no-changes') {
          toast.info(result.message || 'Nenhuma alteração pendente.')
        } else if (result.status === 'unavailable') {
          toast.warning(result.message || 'Esta tela não possui conteúdo para salvar.')
        } else {
          toast.error(result.message || 'Erro ao salvar dados da tela atual.')
        }
        return
      }
      case 'file.settings':
        navigate('/settings')
        return
      case 'file.quit':
        await window.electronAPI?.quitApp?.()
        return

      case 'edit.undo':
        await window.electronAPI?.editUndo?.()
        return
      case 'edit.redo':
        await window.electronAPI?.editRedo?.()
        return
      case 'edit.cut':
        await window.electronAPI?.editCut?.()
        return
      case 'edit.copy':
        await window.electronAPI?.editCopy?.()
        return
      case 'edit.paste':
        await window.electronAPI?.editPaste?.()
        return
      case 'edit.select-all':
        await window.electronAPI?.editSelectAll?.()
        return
      case 'edit.focus-search':
        focusSearchInput()
        return

      case 'view.zoom-in':
        await window.electronAPI?.zoomIn?.()
        return
      case 'view.zoom-out':
        await window.electronAPI?.zoomOut?.()
        return
      case 'view.zoom-reset':
        await window.electronAPI?.zoomReset?.()
        return
      case 'view.window-minimize':
        handleMinimize()
        return
      case 'view.window-maximize':
        handleMaximize()
        return
      case 'view.window-close':
        handleClose()
        return

      case 'help.about':
        window.dispatchEvent(new Event('shipit:open-about'))
        return
      case 'help.check-updates':
        setShowUpdateModal(true)
        void checkForUpdate()
        return
      case 'help.user-manual':
        navigate('/manual')
        return
      case 'help.report-issue':
        window.open(REPORT_ISSUE_URL, '_blank', 'noopener,noreferrer')
        return

      default:
        return
    }
  }, [checkForUpdate, handleClose, handleMaximize, handleMinimize, navigate])

  const isMenuCommandDisabled = useCallback((command: AppMenuCommand) => {
    return Boolean(command.requiresElectron && !window.electronAPI)
  }, [])

  useEffect(() => {
    function handleGlobalShortcuts(event: KeyboardEvent) {
      if (event.defaultPrevented) return

      const matchedCommand = findCommandByShortcut(event)
      if (!matchedCommand || !matchedCommand.globalShortcut) return
      if (isTypingTarget(event.target)) return

      event.preventDefault()
      void executeMenuCommand(matchedCommand.id)
    }

    window.addEventListener('keydown', handleGlobalShortcuts)
    return () => {
      window.removeEventListener('keydown', handleGlobalShortcuts)
    }
  }, [executeMenuCommand])

  return (
    <>
      <div 
        id="titlebar"
        className="h-13.25 bg-titlebar flex items-center justify-between select-none shrink-0"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        {/* Left: Logo + menu */}
        <div
          id="titlebar-left"
          className="flex items-center gap-2 pl-3"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <div id="titlebar-logo" className="flex items-center">
            <img
              src="./assets/images/logo-composto-colorido.svg"
              alt="ShipIt!"
              className="h-7 bg-white/90 rounded px-1"
              onError={(e) => {
                // Fallback to PNG if SVG not found
                (e.target as HTMLImageElement).src = './assets/images/icons/favicon-32x32.png'
              }}
            />
          </div>
          <AppTopMenu onCommand={executeMenuCommand} isCommandDisabled={isMenuCommandDisabled} />
        </div>

        {/* Center: Search Bar */}
        <div
          id="titlebar-search"
          className="flex-1 min-w-0 flex items-center justify-center gap-2 px-2"
        >
          <div
            id="titlebar-nav"
            className="flex items-center gap-1 shrink-0"
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          >
            <button
              id="titlebar-btn-back"
              type="button"
              onClick={handleGoBack}
              disabled={!canGoBack}
              className="h-8 w-8 rounded-md flex items-center justify-center text-titlebar-foreground/70 hover:text-titlebar-foreground hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
              title="Voltar"
              aria-label="Voltar no histórico"
            >
              <i className="fa-solid fa-chevron-left text-xs" aria-hidden="true"></i>
            </button>
            <button
              id="titlebar-btn-forward"
              type="button"
              onClick={handleGoForward}
              disabled={!canGoForward}
              className="h-8 w-8 rounded-md flex items-center justify-center text-titlebar-foreground/70 hover:text-titlebar-foreground hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
              title="Avançar"
              aria-label="Avançar no histórico"
            >
              <i className="fa-solid fa-chevron-right text-xs" aria-hidden="true"></i>
            </button>
          </div>
          <SearchBar />
        </div>

        {/* Right: Window Controls */}
        <div 
          id="titlebar-controls"
          className="flex items-center h-full"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          {/* Minimize */}
          <button
            id="titlebar-btn-minimize"
            onClick={handleMinimize}
            className="h-full w-12 flex items-center justify-center text-titlebar-foreground/70 hover:bg-white/10 transition-colors"
            title="Minimizar"
            aria-label="Minimizar janela"
          >
            <svg width="10" height="1" viewBox="0 0 10 1" fill="currentColor" aria-hidden="true">
              <rect width="10" height="1" />
            </svg>
          </button>

          {/* Maximize/Restore */}
          <button
            id="titlebar-btn-maximize"
            onClick={handleMaximize}
            className="h-full w-12 flex items-center justify-center text-titlebar-foreground/70 hover:bg-white/10 transition-colors"
            title={isMaximized ? 'Restaurar' : 'Maximizar'}
            aria-label={isMaximized ? 'Restaurar janela' : 'Maximizar janela'}
          >
            {isMaximized ? (
              // Restore icon (two overlapping squares)
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true">
                <path d="M2 3v5h5V3H2z" />
                <path d="M3 3V1h5v5H7" />
              </svg>
            ) : (
              // Maximize icon (single square)
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true">
                <rect x="0.5" y="0.5" width="9" height="9" />
              </svg>
            )}
          </button>

          {/* Close */}
          <button
            id="titlebar-btn-close"
            onClick={handleClose}
            className="h-full w-12 flex items-center justify-center text-titlebar-foreground/70 hover:bg-destructive hover:text-destructive-foreground transition-colors"
            title="Fechar"
            aria-label="Fechar janela"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" aria-hidden="true">
              <path d="M1.41 0L5 3.59 8.59 0 10 1.41 6.41 5 10 8.59 8.59 10 5 6.41 1.41 10 0 8.59 3.59 5 0 1.41z" />
            </svg>
          </button>
        </div>
      </div>

      <UpdateModal open={showUpdateModal} onClose={() => setShowUpdateModal(false)} />
    </>
  )
}
