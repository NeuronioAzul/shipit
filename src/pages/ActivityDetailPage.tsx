import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
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
import type { ActivityData, EvidenceData } from '../vite-env'
import { localDb } from '../services/localDb'
import { STATUS_COLORS } from '../utils/statusColors'
import { EvidenceLightbox, type LightboxSlide } from '../components/EvidenceLightbox'
import { TextEvidenceModal } from '../components/TextEvidenceModal'
import { ActivityNav, type NavMode } from '../components/ActivityNav'

function SortableEvidenceCard({ 
  evidence, 
  onDelete,
  onClick,
}: { 
  evidence: EvidenceData
  onDelete: (id: string) => void
  onClick?: () => void
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
      // Force reflow to re-trigger animation
      void handleRef.current.offsetWidth
      handleRef.current.classList.add('animate-shake')
    }
  }

  function getTextPreview(html: string | null): string {
    if (!html) return ''
    return html.replace(/<[^>]*>/g, '').slice(0, 100)
  }

  return (
    <div ref={setNodeRef} style={style} className="cyber-neon-border bg-card border border-border rounded-lg overflow-hidden group p-2 relative">
      <button
        ref={handleRef}
        {...attributes}
        {...listeners}
        className="absolute top-2 left-2 z-10 p-1.5 rounded bg-black/50 text-white/80 hover:text-white cursor-grab active:cursor-grabbing opacity-0 group-hover/ev:opacity-100 transition-opacity touch-none"
        title="Arrastar para reordenar"
        aria-label="Arrastar para reordenar evidência"
      >
        <i className="fa-solid fa-grip-vertical text-xs" aria-hidden="true"></i>
      </button>
      <button
        onClick={() => onDelete(evidence.id)}
        className="absolute top-2 right-2 z-10 p-1.5 rounded bg-destructive/80 text-destructive-foreground hover:bg-destructive cursor-pointer opacity-0 group-hover/ev:opacity-100 transition-opacity"
        title="Excluir evidência"
        aria-label="Excluir evidência"
      >
        <i className="fa-solid fa-trash text-xs" aria-hidden="true"></i>
      </button>
      <div
        className="aspect-video bg-muted flex items-center justify-center overflow-hidden cursor-pointer"
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
              ;(e.target as HTMLImageElement).style.display = 'none'
            }}
          />
        )}
      </div>
      {evidence.caption && (
        <p className="p-2 text-sm text-muted-foreground border-t border-border">
          {evidence.caption}
        </p>
      )}
    </div>
  )
}

export function ActivityDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [activity, setActivity] = useState<ActivityData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dropActive, setDropActive] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [siblings, setSiblings] = useState<ActivityData[]>([])
  const [navMode, setNavMode] = useState<NavMode>('month')
  const [textModalOpen, setTextModalOpen] = useState(false)
  const [textModalMode, setTextModalMode] = useState<'create' | 'edit' | 'view'>('view')
  const [textModalEvidence, setTextModalEvidence] = useState<EvidenceData | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  const loadActivity = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      let data: ActivityData | null
      if (window.electronAPI) {
        data = await window.electronAPI.getActivity(id)
      } else {
        data = localDb.getActivity(id)
      }
      setActivity(data)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadActivity()
  }, [loadActivity])

  // Fetch siblings for prev/next navigation
  useEffect(() => {
    if (!activity?.month_reference) return
    let cancelled = false
    async function fetchSiblings() {
      let list: ActivityData[]
      if (window.electronAPI) {
        list = await window.electronAPI.getActivities(activity!.month_reference)
      } else {
        list = localDb.getActivities(activity!.month_reference)
      }
      if (!cancelled) setSiblings(list)
    }
    fetchSiblings()
    return () => { cancelled = true }
  }, [activity?.month_reference])

  // Keyboard shortcuts: Alt+← / Alt+→
  useEffect(() => {
    if (!activity || siblings.length === 0) return
    const scopeDisabled = !activity.project_scope
    const effectiveMode = scopeDisabled && navMode === 'scope' ? 'month' : navMode
    const filtered = effectiveMode === 'scope'
      ? siblings.filter((a) => a.project_scope === activity.project_scope)
      : siblings
    const idx = filtered.findIndex((a) => a.id === activity.id)

    function handleKeyDown(e: KeyboardEvent) {
      if (!e.altKey) return
      if (e.key === 'ArrowLeft' && idx > 0) {
        e.preventDefault()
        navigate(`/activities/${filtered[idx - 1].id}`)
      } else if (e.key === 'ArrowRight' && idx < filtered.length - 1) {
        e.preventDefault()
        navigate(`/activities/${filtered[idx + 1].id}`)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activity, siblings, navMode, navigate])

  async function handleEvidenceDragEnd(event: DragEndEvent) {
    if (!activity?.evidences) return
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIdx = activity.evidences.findIndex(e => e.id === active.id)
    const newIdx = activity.evidences.findIndex(e => e.id === over.id)
    if (oldIdx === -1 || newIdx === -1) return

    const reordered = arrayMove(activity.evidences, oldIdx, newIdx)
    setActivity({ ...activity, evidences: reordered })

    const items = reordered.map((e, i) => ({ id: e.id, sort_index: i }))
    if (window.electronAPI) {
      await window.electronAPI.reorderEvidences(items)
    }
  }

  async function handleFileDrop(e: React.DragEvent) {
    e.preventDefault()
    setDropActive(false)
    if (!id || !window.electronAPI) return

    const files = Array.from(e.dataTransfer.files).filter(f =>
      /\.(png|jpe?g|gif|bmp|webp)$/i.test(f.name)
    )
    for (const file of files) {
      // Use the file path if available (Electron), else read as buffer
      if ((file as any).path) {
        await window.electronAPI.saveEvidence(id, (file as any).path, null)
      } else {
        const buf = await file.arrayBuffer()
        const ext = '.' + (file.name.split('.').pop() || 'png')
        await window.electronAPI.saveEvidenceFromBuffer(id, buf, ext, null)
      }
    }
    loadActivity()
  }

  async function handleDeleteEvidence(evidenceId: string) {
    if (!window.electronAPI) return
    setDeleting(true)
    try {
      const success = await window.electronAPI.deleteEvidence(evidenceId)
      if (success && activity) {
        setActivity({
          ...activity,
          evidences: activity.evidences?.filter(e => e.id !== evidenceId) || []
        })
        window.dispatchEvent(new Event('shipit:trash-changed'))
        toast.success('Evidência movida para a lixeira')
      }
    } catch {
      toast.error('Erro ao excluir evidência')
    } finally {
      setDeleting(false)
      setConfirmDelete(null)
    }
  }

  async function handleFileSelect() {
    if (!id) return
    if (window.electronAPI) {
      const paths = await window.electronAPI.selectImages()
      if (paths.length === 0) return
      setUploading(true)
      try {
        for (const filePath of paths) {
          await window.electronAPI.saveEvidence(id, filePath, null)
        }
        loadActivity()
      } finally {
        setUploading(false)
      }
    } else {
      fileInputRef.current?.click()
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!id || !e.target.files || e.target.files.length === 0) return
    handleFilesFromInput(e.target.files)
    e.target.value = ''
  }

  async function handleFilesFromInput(files: FileList) {
    if (!id || !window.electronAPI) return
    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) continue
        const buffer = await file.arrayBuffer()
        const ext = '.' + (file.name.split('.').pop() || 'png')
        await window.electronAPI.saveEvidenceFromBuffer(id, buffer, ext, null)
      }
      loadActivity()
    } finally {
      setUploading(false)
    }
  }

  async function handlePaste() {
    if (!id || !window.electronAPI) return
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
        setUploading(true)
        try {
          for (const file of imageFiles) {
            const buffer = await file.arrayBuffer()
            const ext = '.' + (file.name.split('.').pop() || 'png')
            await window.electronAPI.saveEvidenceFromBuffer(id, buffer, ext, null)
          }
          loadActivity()
        } finally {
          setUploading(false)
        }
      }
    } catch {
      // Clipboard API not available or permission denied
    }
  }

  function formatDate(d: string | null): string {
    if (!d) return '—'
    return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR')
  }

  function parseLinks(linkRef: string | null): string[] {
    if (!linkRef) return []
    return linkRef.split('\n').map((l) => l.trim()).filter(Boolean)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <i className="fa-solid fa-spinner fa-spin text-3xl text-muted-foreground"></i>
      </div>
    )
  }

  if (!activity) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground text-lg">Atividade não encontrada.</p>
        <button
          onClick={() => navigate('/activities')}
          className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg cursor-pointer"
        >
          Voltar
        </button>
      </div>
    )
  }

  const links = parseLinks(activity.link_ref)

  return (
    <div id="activity-detail" className="max-w-6xl mx-auto">
      {/* Header */}
      <div id="activity-detail-header" className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            id="activity-detail-btn-back"
            onClick={() => navigate(`/activities?month=${activity.month_reference}`)}
            className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer rounded focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            title="Voltar"
            aria-label="Voltar para lista de atividades"
          >
            <i className="fa-solid fa-arrow-left text-lg" aria-hidden="true"></i>
          </button>
          <h1 className="text-2xl font-bold">Detalhes da Atividade</h1>
        </div>
        <button
          id="activity-detail-btn-edit"
          onClick={() => navigate(`/activities/${activity.id}/edit`)}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg
            hover:opacity-90 transition-opacity cursor-pointer flex items-center gap-2"
        >
          <i className="fa-solid fa-pen-to-square"></i>
          Editar
        </button>
      </div>

      {/* Top navigation */}
      {siblings.length > 1 && (
        <div id="activity-detail-nav" className="mb-4">
          <ActivityNav
            siblings={siblings}
            currentId={activity.id}
            currentProjectScope={activity.project_scope}
            navMode={navMode}
            onNavModeChange={setNavMode}
          />
        </div>
      )}

      {/* Info card */}
      <div id="activity-detail-info" className="bg-card border border-border rounded-lg p-6 space-y-5">
        {/* Status + Period */}
        <div className="flex flex-wrap items-center gap-4">
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[activity.status] || ''}`}
          >
            {activity.status}
          </span>
          <span className="text-sm text-muted-foreground">
            <i className="fa-regular fa-calendar mr-1"></i>
            {formatDate(activity.date_start)} — {formatDate(activity.date_end)}
          </span>
          {activity.attendance_type && (
            <span className="text-sm text-muted-foreground">
              <i className="fa-solid fa-location-dot mr-1"></i>
              {activity.attendance_type}
            </span>
          )}
          <span className="text-sm text-muted-foreground">
            <i className="fa-solid fa-calendar-days mr-1"></i>
            Ref: {activity.month_reference}
          </span>
          {activity.project_scope && (
            <span className="text-sm text-muted-foreground">
              <i className="fa-solid fa-diagram-project mr-1"></i>
              {activity.project_scope}
            </span>
          )}
        </div>

        {/* Description */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Descrição</h3>
          <div className="text-foreground whitespace-pre-wrap leading-relaxed">
            {activity.description || (
              <span className="text-muted-foreground italic">Sem descrição</span>
            )}
          </div>
        </div>

        {/* Links */}
        {links.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">
              Links de Referência
            </h3>
            <ul className="space-y-1">
              {links.map((link, i) => (
                <li key={i}>
                  <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline break-all text-sm"
                  >
                    <i className="fa-solid fa-link mr-1 text-xs"></i>
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Evidences */}
        <div
          id="activity-detail-evidence"
          onDragOver={(e) => { e.preventDefault(); setDropActive(true) }}
          onDragLeave={() => setDropActive(false)}
          onDrop={handleFileDrop}
        >
          <h3 className="text-sm font-medium text-muted-foreground mb-3">
            Evidências ({activity.evidences?.length || 0})
          </h3>

          {(!activity.evidences || activity.evidences.length === 0) ? (
            <div
              onClick={handleFileSelect}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer ${
                dropActive 
                  ? 'border-accent bg-accent/10 scale-[1.02] ring-2 ring-accent/30' 
                  : 'border-border hover:border-primary hover:bg-muted/30'
              }`}
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
          ) : (
            <>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleEvidenceDragEnd}>
                <SortableContext items={activity.evidences.map(e => e.id)} strategy={rectSortingStrategy}>
                  <div id="activity-detail-evidence-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {activity.evidences.map((ev) => {
                      const imageEvidences = activity.evidences!.filter(e => e.type !== 'text')
                      return (
                        <SortableEvidenceCard 
                          key={ev.id} 
                          evidence={ev} 
                          onDelete={(id) => setConfirmDelete(id)}
                          onClick={() => {
                            if (ev.type === 'text') {
                              setTextModalEvidence(ev)
                              setTextModalMode('view')
                              setTextModalOpen(true)
                            } else {
                              const imgIdx = imageEvidences.findIndex(e => e.id === ev.id)
                              setLightboxIndex(imgIdx >= 0 ? imgIdx : 0)
                              setLightboxOpen(true)
                            }
                          }}
                        />
                      )
                    })}
                  </div>
                </SortableContext>
              </DndContext>

              <div
                onClick={handleFileSelect}
                className={`mt-4 border-2 border-dashed rounded-lg p-4 text-center transition-all cursor-pointer ${
                  dropActive 
                    ? 'border-accent bg-accent/10 scale-[1.02] ring-2 ring-accent/30' 
                    : 'border-border hover:border-primary hover:bg-muted/30'
                }`}
              >
                {uploading ? (
                  <div className="text-muted-foreground">
                    <i className="fa-solid fa-spinner fa-spin text-lg"></i>
                    <span className="ml-2 text-sm">Enviando...</span>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <span className="text-xs text-muted-foreground">
                      <i className="fa-solid fa-cloud-arrow-up mr-1"></i>
                      Arraste ou clique para selecionar
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handlePaste()
                      }}
                      className="cyber-neon-border text-xs px-2 py-1 border border-border rounded-lg cursor-pointer 
                      hover:bg-success transition-colors text-foreground hover:text-foreground"
                    >
                      <i className="fa-solid fa-paste mr-1"></i>
                      Colar
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Hidden file input (browser fallback) */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleInputChange}
            className="hidden"
          />
        </div>

        {/* Meta */}
        <div className="text-xs text-muted-foreground pt-3 border-t border-border">
          Última atualização: {new Date(activity.last_updated).toLocaleString('pt-BR')}
        </div>
      </div>

      {/* Bottom navigation */}
      {siblings.length > 1 && (
        <div className="mt-4">
          <ActivityNav
            siblings={siblings}
            currentId={activity.id}
            currentProjectScope={activity.project_scope}
            navMode={navMode}
            onNavModeChange={setNavMode}
          />
        </div>
      )}

      {/* Confirm delete modal */}
      {confirmDelete && (
        <div
          id="activity-detail-delete-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setConfirmDelete(null)}
          role="alertdialog" aria-modal="true" aria-labelledby="detail-delete-title"
        >
          <div
            className="bg-card border border-border rounded-lg p-6 shadow-xl max-w-sm w-full mx-4 animate-modal-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4 text-destructive">
              <i className="fa-solid fa-triangle-exclamation text-xl" aria-hidden="true"></i>
              <h2 id="detail-delete-title" className="text-lg font-semibold">Excluir evidência?</h2>
            </div>
            <p className="text-muted-foreground mb-6">
              A evidência será movida para a lixeira e poderá ser restaurada em até 3 meses.
            </p>
            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => setConfirmDelete(null)}
                disabled={deleting}
                className="px-4 py-2 text-sm rounded bg-primary text-primary-foreground hover:bg-amber-400 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDeleteEvidence(confirmDelete)}
                disabled={deleting}
                className="px-4 py-2 text-sm bg-destructive text-destructive-foreground rounded hover:bg-destructive/60 transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {deleting ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin"></i>
                    Excluindo...
                  </>
                ) : (
                  'Excluir'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {activity.evidences && activity.evidences.length > 0 && (() => {
        const imageEvidences = activity.evidences!.filter(e => e.type !== 'text')
        return imageEvidences.length > 0 ? (
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
        ) : null
      })()}

      <TextEvidenceModal
        open={textModalOpen}
        mode={textModalMode}
        onClose={() => setTextModalOpen(false)}
        initialContent={textModalEvidence?.text_content || ''}
        initialCaption={textModalEvidence?.caption || ''}
      />
    </div>
  )
}
