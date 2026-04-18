import { useState, useRef, useCallback, type DragEvent } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { EvidenceData } from '../vite-env'
import { localDb } from '../services/localDb'
import { EvidenceLightbox, type LightboxSlide } from './EvidenceLightbox'
import { TextEvidenceModal } from './TextEvidenceModal'

interface EvidenceUploadProps {
  activityId: string
  evidences: EvidenceData[]
  onEvidenceAdded: (evidence: EvidenceData) => void
  onEvidenceDeleted: (id: string) => void
  onCaptionUpdated: (id: string, caption: string) => void
  onReorder?: (evidences: EvidenceData[]) => void
  onTextEvidenceAdded?: (evidence: EvidenceData) => void
  onTextEvidenceUpdated?: (id: string, textContent: string) => void
}

function SortableEvidenceCard({
  evidence,
  onDelete,
  onEditCaption,
  editingCaption,
  captionValue,
  setCaptionValue,
  saveCaption,
  setEditingCaption,
  onClick,
  onEdit,
}: {
  evidence: EvidenceData
  onDelete: (id: string) => void
  onEditCaption: (evidence: EvidenceData) => void
  editingCaption: string | null
  captionValue: string
  setCaptionValue: (val: string) => void
  saveCaption: (id: string) => void
  setEditingCaption: (id: string | null) => void
  onClick?: () => void
  onEdit?: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: evidence.id,
  })
  const handleRef = useRef<HTMLButtonElement>(null)

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const isText = evidence.type === 'text'

  function handleImageDragStart(e: React.DragEvent) {
    e.preventDefault()
    if (handleRef.current) {
      handleRef.current.classList.remove('animate-shake')
      void handleRef.current.offsetWidth
      handleRef.current.classList.add('animate-shake')
    }
  }

  function getTextPreview(html: string | null): string {
    if (!html) return ''
    return html.replace(/<[^>]*>/g, '').slice(0, 100)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="cyber-neon-border p-2 bg-card border border-border rounded-lg overflow-hidden group"
    >
      {/* Preview area */}
      <div
        className="aspect-video bg-muted flex items-center justify-center overflow-hidden relative cursor-pointer"
        onClick={onClick}
      >
        {isText ? (
          <div className="flex flex-col items-center justify-center gap-2 p-4 w-full h-full">
            <i className="fa-solid fa-file-lines text-3xl text-primary/60" aria-hidden="true"></i>
            <p className="text-xs text-muted-foreground line-clamp-3 text-center px-2">
              {getTextPreview(evidence.text_content) || 'Texto vazio'}
            </p>
          </div>
        ) : (
          <img
            src={
              evidence.file_path?.startsWith('data:')
                ? evidence.file_path
                : `shipit-evidence://host?path=${encodeURIComponent(evidence.file_path || '')}`
            }
            alt={evidence.caption || 'Evidência'}
            className="w-full h-full object-contain"
            draggable
            onDragStart={handleImageDragStart}
            onError={(e) => {
              ;(e.target as HTMLImageElement).src = ''
              ;(e.target as HTMLImageElement).style.display = 'none'
            }}
          />
        )}
        {/* Drag handle */}
        <button
          ref={handleRef}
          type="button"
          {...attributes}
          {...listeners}
          className="absolute top-2 left-2 p-1.5 bg-black/50 text-white/80 rounded
            opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing touch-none"
          title="Arrastar para reordenar"
          aria-label="Arrastar para reordenar evidência"
        >
          <i className="fa-solid fa-grip-vertical text-xs" aria-hidden="true"></i>
        </button>
        {/* Edit button (text evidence only) */}
        {isText && onEdit && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onEdit() }}
            className="absolute top-2 right-10 p-1.5 bg-primary/80 text-primary-foreground rounded
              opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:bg-primary"
            title="Editar evidência de texto"
            aria-label="Editar evidência de texto"
          >
            <i className="fa-solid fa-pen text-xs" aria-hidden="true"></i>
          </button>
        )}
        {/* Delete button */}
        <button
          type="button"
          onClick={() => onDelete(evidence.id)}
          className="absolute top-2 right-2 p-1.5 bg-destructive/80 text-destructive-foreground rounded
            opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:bg-destructive"
          title="Remover evidência"
          aria-label="Remover evidência"
        >
          <i className="fa-solid fa-trash text-xs" aria-hidden="true"></i>
        </button>
      </div>

      {/* Caption */}
      <div className="p-3">
        {editingCaption === evidence.id ? (
          <div className="flex gap-2">
            <input
              type="text"
              value={captionValue}
              onChange={(e) => setCaptionValue(e.target.value)}
              placeholder="Legenda da imagem..."
              className="flex-1 px-2 py-1 bg-background text-foreground border border-border rounded text-sm
                focus:outline-none focus:ring-1 focus:ring-ring"
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveCaption(evidence.id)
                if (e.key === 'Escape') setEditingCaption(null)
              }}
              autoFocus
            />
            <button
              type="button"
              onClick={() => saveCaption(evidence.id)}
              className="px-2 py-1 bg-primary text-primary-foreground rounded text-sm cursor-pointer hover:opacity-90"
              aria-label="Salvar legenda"
            >
              <i className="fa-solid fa-check" aria-hidden="true"></i>
            </button>
          </div>
        ) : (
          <p
            className="text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
            onClick={() => onEditCaption(evidence)}
            title="Clique para editar a legenda"
          >
            {evidence.caption || (
              <span className="italic">Clique para adicionar legenda...</span>
            )}
          </p>
        )}
      </div>
    </div>
  )
}

export function EvidenceUpload({
  activityId,
  evidences,
  onEvidenceAdded,
  onEvidenceDeleted,
  onCaptionUpdated,
  onReorder,
  onTextEvidenceAdded,
  onTextEvidenceUpdated,
}: EvidenceUploadProps) {
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [editingCaption, setEditingCaption] = useState<string | null>(null)
  const [captionValue, setCaptionValue] = useState('')
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [textModalOpen, setTextModalOpen] = useState(false)
  const [textModalMode, setTextModalMode] = useState<'create' | 'edit' | 'view'>('create')
  const [textModalEvidence, setTextModalEvidence] = useState<EvidenceData | null>(null)
  const dropRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id || !onReorder) return

    const oldIdx = evidences.findIndex(e => e.id === active.id)
    const newIdx = evidences.findIndex(e => e.id === over.id)
    if (oldIdx === -1 || newIdx === -1) return

    const reordered = arrayMove(evidences, oldIdx, newIdx)
    onReorder(reordered)
  }

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      setUploading(true)
      try {
        for (const file of Array.from(files)) {
          if (!file.type.startsWith('image/')) continue

          if (window.electronAPI) {
            // In Electron: read file to ArrayBuffer and send via IPC
            const buffer = await file.arrayBuffer()
            const ext = '.' + (file.name.split('.').pop() || 'png')
            const evidence = await window.electronAPI.saveEvidenceFromBuffer(
              activityId,
              buffer,
              ext,
              null
            )
            onEvidenceAdded(evidence)
          } else {
            // Browser fallback: convert to data URL
            const dataUrl = await fileToDataUrl(file)
            const evidence = localDb.saveEvidence(activityId, dataUrl, null)
            onEvidenceAdded(evidence)
          }
        }
      } finally {
        setUploading(false)
      }
    },
    [activityId, onEvidenceAdded]
  )

  // Drag & Drop handlers
  function handleDragEnter(e: DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setDragging(true)
  }

  function handleDragLeave(e: DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (e.currentTarget === dropRef.current) setDragging(false)
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault()
    e.stopPropagation()
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setDragging(false)
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files)
    }
  }

  // File input handler
  function handleFileSelect() {
    if (window.electronAPI) {
      // Use Electron native dialog
      window.electronAPI.selectImages().then(async (paths) => {
        if (paths.length === 0) return
        setUploading(true)
        try {
          for (const filePath of paths) {
            const evidence = await window.electronAPI!.saveEvidence(
              activityId,
              filePath,
              null
            )
            onEvidenceAdded(evidence)
          }
        } finally {
          setUploading(false)
        }
      })
    } else {
      fileInputRef.current?.click()
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files)
      e.target.value = ''
    }
  }

  // Clipboard paste handler
  async function handlePaste() {
    try {
      const clipboardItems = await navigator.clipboard.read()
      const imageFiles: File[] = []

      for (const item of clipboardItems) {
        for (const type of item.types) {
          if (type.startsWith('image/')) {
            const blob = await item.getType(type)
            const ext = type.split('/')[1] || 'png'
            const file = new File([blob], `clipboard.${ext}`, { type })
            imageFiles.push(file)
          }
        }
      }

      if (imageFiles.length > 0) {
        handleFiles(imageFiles)
      }
    } catch {
      // Clipboard API not available or permission denied
    }
  }

  // Caption editing
  function startEditCaption(evidence: EvidenceData) {
    setEditingCaption(evidence.id)
    setCaptionValue(evidence.caption || '')
  }

  function saveCaption(id: string) {
    onCaptionUpdated(id, captionValue)
    setEditingCaption(null)
    setCaptionValue('')
  }

  // Text evidence modal helpers
  function openTextModalCreate() {
    setTextModalMode('create')
    setTextModalEvidence(null)
    setTextModalOpen(true)
  }

  function openTextModalView(evidence: EvidenceData) {
    setTextModalMode('view')
    setTextModalEvidence(evidence)
    setTextModalOpen(true)
  }

  function openTextModalEdit(evidence: EvidenceData) {
    setTextModalMode('edit')
    setTextModalEvidence(evidence)
    setTextModalOpen(true)
  }

  async function handleTextModalSave(textContent: string, caption: string | null) {
    if (textModalMode === 'create') {
      if (onTextEvidenceAdded) {
        let evidence: EvidenceData
        if (window.electronAPI) {
          evidence = await window.electronAPI.saveTextEvidence(activityId, textContent, caption)
        } else {
          evidence = localDb.saveTextEvidence(activityId, textContent, caption)
        }
        onTextEvidenceAdded(evidence)
      }
    } else if (textModalMode === 'edit' && textModalEvidence && onTextEvidenceUpdated) {
      if (window.electronAPI) {
        await window.electronAPI.updateTextEvidence(textModalEvidence.id, textContent)
      } else {
        localDb.updateTextEvidence(textModalEvidence.id, textContent)
      }
      onTextEvidenceUpdated(textModalEvidence.id, textContent)
      // Also update caption if changed
      if (caption !== textModalEvidence.caption) {
        onCaptionUpdated(textModalEvidence.id, caption || '')
      }
    }
    setTextModalOpen(false)
  }

  // Lightbox: only image evidences
  const imageEvidences = evidences.filter(e => e.type !== 'text')

  function handleCardClick(evidence: EvidenceData) {
    if (evidence.type === 'text') {
      openTextModalView(evidence)
    } else {
      const imgIdx = imageEvidences.findIndex(e => e.id === evidence.id)
      setLightboxIndex(imgIdx >= 0 ? imgIdx : 0)
      setLightboxOpen(true)
    }
  }

  return (
    <div id="evidence-upload" className="space-y-4">
      {/* Drop zone */}
      <div
        id="evidence-upload-dropzone"
        ref={dropRef}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer
          ${dragging ? 'border-accent bg-accent/10 scale-[1.02] ring-2 ring-accent/30' : 'border-border hover:border-primary hover:bg-muted/30'}`}
        onClick={handleFileSelect}
      >
        {uploading ? (
          <div className="text-muted-foreground">
            <i className="fa-solid fa-spinner fa-spin text-2xl mb-2"></i>
            <p>Enviando...</p>
          </div>
        ) : (
          <>
            <i className="fa-solid fa-cloud-arrow-up text-3xl text-muted-foreground mb-3 block"></i>
            <p className="text-foreground font-medium">
              Arraste imagens aqui ou clique para selecionar
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              PNG, JPG, GIF, BMP, WebP
            </p>
            <div className="flex items-center justify-center gap-3 mt-3">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  handlePaste()
                }}
                className="cyber-neon-border text-sm px-3 py-1 border border-border rounded-md
                  hover:bg-muted transition-colors cursor-pointer text-muted-foreground hover:text-foreground"
              >
                <i className="fa-solid fa-paste mr-1"></i>
                Colar da Área de Transferência
              </button>
            </div>
          </>
        )}
      </div>

      {/* Hidden file input (browser fallback) */}
      <input
        id="evidence-upload-file-input"
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleInputChange}
        className="hidden"
      />

      {/* Evidence list */}
      {evidences.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={evidences.map(e => e.id)} strategy={rectSortingStrategy}>
            <div id="evidence-upload-grid" className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {evidences.map((evidence) => (
                <SortableEvidenceCard
                  key={evidence.id}
                  evidence={evidence}
                  onDelete={onEvidenceDeleted}
                  onEditCaption={startEditCaption}
                  editingCaption={editingCaption}
                  captionValue={captionValue}
                  setCaptionValue={setCaptionValue}
                  saveCaption={saveCaption}
                  setEditingCaption={setEditingCaption}
                  onClick={() => handleCardClick(evidence)}
                  onEdit={evidence.type === 'text' ? () => openTextModalEdit(evidence) : undefined}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Add text evidence button */}
      <button
        type="button"
        onClick={openTextModalCreate}
        className="cyber-neon-border w-full border-2 border-dashed border-border rounded-lg p-4 text-center
          hover:border-primary hover:bg-muted/30 transition-all cursor-pointer flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground"
      >
        <i className="fa-solid fa-file-circle-plus"></i>
        Adicionar Texto como Evidência
      </button>

      {imageEvidences.length > 0 && (
        <EvidenceLightbox
          open={lightboxOpen}
          index={lightboxIndex}
          slides={imageEvidences.map((ev): LightboxSlide => ({
            src: ev.file_path?.startsWith('data:')
              ? ev.file_path
              : `shipit-evidence://host?path=${encodeURIComponent(ev.file_path || '')}`,
            description: ev.caption || undefined,
          }))}
          onClose={() => setLightboxOpen(false)}
        />
      )}

      <TextEvidenceModal
        open={textModalOpen}
        mode={textModalMode}
        onClose={() => setTextModalOpen(false)}
        onSave={handleTextModalSave}
        initialContent={textModalEvidence?.text_content || ''}
        initialCaption={textModalEvidence?.caption || ''}
      />
    </div>
  )
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
