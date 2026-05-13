import { useEffect } from 'react'
import { useUpdateState } from '../contexts/UpdateStateContext'
import { UpdateStatusPanel } from './UpdateStatusPanel'

interface UpdateModalProps {
  open: boolean
  onClose: () => void
}

export function UpdateModal({ open, onClose }: UpdateModalProps) {
  const {
    checkForUpdate,
    downloadUpdate,
    installUpdate,
    isElectron,
    updateStatus,
  } = useUpdateState()

  useEffect(() => {
    if (!open) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose, open])

  if (!open) return null

  return (
    <div
      id="titlebar-update-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="titlebar-update-modal-title"
    >
      <div
        className="bg-card border border-border rounded-lg shadow-xl w-full max-w-xl mx-4 animate-modal-in"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <h2 id="titlebar-update-modal-title" className="text-lg font-semibold flex items-center gap-2">
              <i className="fa-solid fa-cloud-arrow-down text-primary" aria-hidden="true"></i>
              Atualizações do ShipIt!
            </h2>
            {updateStatus.attentionVisible && (
              <span className="shipit-attention-badge relative inline-flex h-2.5 w-2.5 rounded-full bg-accent ring-2 ring-card" aria-hidden="true"></span>
            )}
          </div>

          <button
            id="titlebar-update-modal-btn-close"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer rounded focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            aria-label="Fechar"
          >
            <i className="fa-solid fa-xmark text-lg" aria-hidden="true"></i>
          </button>
        </div>

        <div className="px-6 py-5">
          <UpdateStatusPanel
            idPrefix="update-modal"
            isElectron={isElectron}
            updateStatus={updateStatus}
            onCheck={() => { void checkForUpdate() }}
            onDownload={() => { void downloadUpdate() }}
            onInstall={() => { void installUpdate() }}
          />
        </div>
      </div>
    </div>
  )
}