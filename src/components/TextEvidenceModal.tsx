import { useState, useEffect, useCallback } from 'react'
import { TextEvidenceEditor } from './TextEvidenceEditor'

type ModalMode = 'create' | 'edit' | 'view'

interface TextEvidenceModalProps {
  open: boolean
  mode: ModalMode
  onClose: () => void
  onSave?: (textContent: string, caption: string | null) => void
  initialContent?: string
  initialCaption?: string
}

function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim()
}

const TITLES: Record<ModalMode, string> = {
  create: 'Adicionar Texto como Evidência',
  edit: 'Editar Evidência de Texto',
  view: 'Evidência de Texto',
}

export function TextEvidenceModal({
  open,
  mode,
  onClose,
  onSave,
  initialContent = '',
  initialCaption = '',
}: TextEvidenceModalProps) {
  const [textContent, setTextContent] = useState(initialContent)
  const [caption, setCaption] = useState(initialCaption)

  useEffect(() => {
    if (open) {
      setTextContent(initialContent)
      setCaption(initialCaption)
    }
  }, [open, initialContent, initialCaption])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose]
  )

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, handleKeyDown])

  if (!open) return null

  const isReadOnly = mode === 'view'
  const plainText = stripHtmlTags(textContent)
  const canSave = plainText.length > 0

  function handleSave() {
    if (!canSave || !onSave) return
    onSave(textContent, caption.trim() || null)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="text-evidence-modal-title"
    >
      <div
        className="bg-card border border-border rounded-lg shadow-xl w-full max-w-2xl mx-4 animate-modal-in flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 id="text-evidence-modal-title" className="text-lg font-semibold flex items-center gap-2">
            <i className="fa-solid fa-file-lines text-primary" aria-hidden="true"></i>
            {TITLES[mode]}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <i className="fa-solid fa-xmark text-lg" aria-hidden="true"></i>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
          {/* Caption */}
          {!isReadOnly ? (
            <div>
              <label htmlFor="text-ev-caption" className="block text-sm font-medium text-foreground mb-1">
                Legenda <span className="text-muted-foreground font-normal">(opcional)</span>
              </label>
              <input
                id="text-ev-caption"
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Legenda da evidência..."
                className="w-full px-3 py-2 bg-card text-foreground border border-border rounded-lg
                  focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
              />
            </div>
          ) : caption ? (
            <div>
              <span className="text-sm font-medium text-muted-foreground">Legenda:</span>
              <p className="text-foreground mt-1">{caption}</p>
            </div>
          ) : null}

          {/* Editor */}
          <div>
            {!isReadOnly && (
              <label className="block text-sm font-medium text-foreground mb-1">
                Conteúdo <span className="text-destructive">*</span>
              </label>
            )}
            <TextEvidenceEditor
              content={textContent}
              onChange={setTextContent}
              readOnly={isReadOnly}
            />
          </div>
        </div>

        {/* Footer */}
        {!isReadOnly && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded hover:bg-muted transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave}
              className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <i className="fa-solid fa-floppy-disk" aria-hidden="true"></i>
              Salvar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
