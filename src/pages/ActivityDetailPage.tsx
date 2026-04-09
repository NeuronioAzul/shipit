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

const STATUS_COLORS: Record<string, string> = {
  'Em andamento': 'bg-brand-blue/15 text-primary',
  'Concluído': 'bg-success/15 text-success',
  'Cancelado': 'bg-destructive/15 text-destructive',
  'Pendente': 'bg-warning/15 text-warning-foreground',
}

function SortableEvidenceCard({ 
  evidence, 
  onDelete 
}: { 
  evidence: EvidenceData
  onDelete: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: evidence.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="border border-border rounded-lg overflow-hidden group/ev relative">
      <button
        {...attributes}
        {...listeners}
        className="absolute top-2 left-2 z-10 p-1.5 rounded bg-black/50 text-white/80 hover:text-white cursor-grab active:cursor-grabbing opacity-0 group-hover/ev:opacity-100 transition-opacity touch-none"
        title="Arrastar para reordenar"
      >
        <i className="fa-solid fa-grip-vertical text-xs"></i>
      </button>
      <button
        onClick={() => onDelete(evidence.id)}
        className="absolute top-2 right-2 z-10 p-1.5 rounded bg-destructive/80 text-destructive-foreground hover:bg-destructive cursor-pointer opacity-0 group-hover/ev:opacity-100 transition-opacity"
        title="Excluir evidência"
      >
        <i className="fa-solid fa-trash text-xs"></i>
      </button>
      <div className="aspect-video bg-muted flex items-center justify-center overflow-hidden">
        <img
          src={
            evidence.file_path.startsWith('data:')
              ? evidence.file_path
              : `shipit-evidence://host?path=${encodeURIComponent(evidence.file_path)}`
          }
          alt={evidence.caption || 'Evidência'}
          className="w-full h-full object-contain"
          onError={(e) => {
            ;(e.target as HTMLImageElement).style.display = 'none'
          }}
        />
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
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/activities?month=${activity.month_reference}`)}
            className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title="Voltar"
          >
            <i className="fa-solid fa-arrow-left text-lg"></i>
          </button>
          <h1 className="text-2xl font-bold">Detalhes da Atividade</h1>
        </div>
        <button
          onClick={() => navigate(`/activities/${activity.id}/edit`)}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg
            hover:opacity-90 transition-opacity cursor-pointer flex items-center gap-2"
        >
          <i className="fa-solid fa-pen-to-square"></i>
          Editar
        </button>
      </div>

      {/* Info card */}
      <div className="bg-card border border-border rounded-lg p-6 space-y-5">
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
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                dropActive ? 'border-accent bg-accent/10' : 'border-border hover:border-primary hover:bg-muted/30'
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
                      className="text-sm px-3 py-1 border border-border rounded-md
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {activity.evidences.map((ev) => (
                      <SortableEvidenceCard 
                        key={ev.id} 
                        evidence={ev} 
                        onDelete={(id) => setConfirmDelete(id)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>

              <div
                onClick={handleFileSelect}
                className={`mt-4 border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer ${
                  dropActive ? 'border-accent bg-accent/10' : 'border-border hover:border-primary hover:bg-muted/30'
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
                      className="text-xs px-2 py-1 border border-border rounded
                        hover:bg-muted transition-colors cursor-pointer text-muted-foreground hover:text-foreground"
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

      {/* Confirm delete modal */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setConfirmDelete(null)}
        >
          <div
            className="bg-card border border-border rounded-lg p-6 shadow-xl max-w-sm w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4 text-destructive">
              <i className="fa-solid fa-triangle-exclamation text-xl"></i>
              <h2 className="text-lg font-semibold">Excluir evidência?</h2>
            </div>
            <p className="text-muted-foreground mb-6">
              A evidência será movida para a lixeira e poderá ser restaurada em até 3 meses.
            </p>
            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => setConfirmDelete(null)}
                disabled={deleting}
                className="px-4 py-2 text-sm rounded hover:bg-muted transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDeleteEvidence(confirmDelete)}
                disabled={deleting}
                className="px-4 py-2 text-sm bg-destructive text-destructive-foreground rounded hover:bg-destructive/90 transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
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
    </div>
  )
}
