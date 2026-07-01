import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Lightbox from 'yet-another-react-lightbox'
import Zoom from 'yet-another-react-lightbox/plugins/zoom'
import Captions from 'yet-another-react-lightbox/plugins/captions'
import Counter from 'yet-another-react-lightbox/plugins/counter'
import 'yet-another-react-lightbox/styles.css'
import 'yet-another-react-lightbox/plugins/captions.css'
import 'yet-another-react-lightbox/plugins/counter.css'
import { canUseEvidenceFileActions, copyEvidenceImage, openEvidenceLocation } from '../services/evidenceClipboard'

export interface LightboxSlide {
  src: string
  description?: string
  /** Caminho absoluto do arquivo (apenas evidências de imagem reais no Electron). */
  filePath?: string
}

interface EvidenceLightboxProps {
  open: boolean
  index: number
  slides: LightboxSlide[]
  onClose: () => void
}

export function EvidenceLightbox({ open, index, slides, onClose }: EvidenceLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(index)
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null)

  // Ressincroniza o índice ao (re)abrir o lightbox
  useEffect(() => {
    if (open) setCurrentIndex(index)
  }, [open, index])

  // Menu de contexto (botão direito) dentro do lightbox
  useEffect(() => {
    if (!open) {
      setMenu(null)
      return
    }
    function handleContextMenu(e: MouseEvent) {
      const target = e.target as HTMLElement | null
      if (!target?.closest('.yarl__container')) return
      e.preventDefault()
      setMenu({ x: e.clientX, y: e.clientY })
    }
    function closeMenu() {
      setMenu(null)
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenu(null)
    }
    document.addEventListener('contextmenu', handleContextMenu)
    document.addEventListener('click', closeMenu)
    document.addEventListener('scroll', closeMenu, true)
    document.addEventListener('keydown', handleKeyDown, true)
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu)
      document.removeEventListener('click', closeMenu)
      document.removeEventListener('scroll', closeMenu, true)
      document.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [open])

  const currentFilePath = slides[currentIndex]?.filePath
  const actionsEnabled = canUseEvidenceFileActions(currentFilePath)

  return (
    <>
      <Lightbox
        open={open}
        close={onClose}
        index={index}
        slides={slides}
        on={{ view: ({ index: i }) => setCurrentIndex(i) }}
        plugins={[Zoom, Captions, Counter]}
        captions={{ descriptionTextAlign: 'center' }}
        zoom={{ maxZoomPixelRatio: 5, scrollToZoom: true }}
      />
      {menu && actionsEnabled && createPortal(
        <div
          className="fixed min-w-56 rounded-md border border-border bg-card py-1 shadow-lg"
          style={{ top: menu.y, left: menu.x, zIndex: 10000 }}
          onClick={(e) => e.stopPropagation()}
          onContextMenu={(e) => e.preventDefault()}
        >
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground hover:bg-muted cursor-pointer"
            onClick={() => { setMenu(null); copyEvidenceImage(currentFilePath) }}
          >
            <i className="fa-solid fa-copy w-4 text-center" aria-hidden="true"></i>
            Copiar para a área de transferência
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground hover:bg-muted cursor-pointer"
            onClick={() => { setMenu(null); openEvidenceLocation(currentFilePath) }}
          >
            <i className="fa-solid fa-folder-open w-4 text-center" aria-hidden="true"></i>
            Abrir local do arquivo
          </button>
        </div>,
        document.body
      )}
    </>
  )
}
