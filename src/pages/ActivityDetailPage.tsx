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
import { getCurrentMonthRef, localDb } from '../services/localDb'
import { STATUS_COLORS } from '../utils/statusColors'
import { EvidenceLightbox, type LightboxSlide } from '../components/EvidenceLightbox'
import { TextEvidenceModal } from '../components/TextEvidenceModal'
import { canUseEvidenceFileActions, copyEvidenceImage } from '../services/evidenceClipboard'
import { ActivityNav } from '../components/ActivityNav'
import { isTypingTarget } from '../utils/keyboardGuards'
import { shiftMonthReference } from '../utils/monthReference'
import { getEvidenceTypeCounts } from '../utils/evidenceCounts'
import { parseSvnReleasesStored } from '../utils/svnReleases'
import { copyTextToClipboard } from '../utils/clipboard'
import { isRichTextEmpty, normalizeToHtml } from '../utils/richText'
import {
  resolveMonthNavigation,
  shouldSyncSelectedMonthToActivity,
} from '../utils/activityMonthNavigation'

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
    <div ref={setNodeRef} style={style} className="bg-card border border-border rounded-lg overflow-hidden group/ev p-2 relative">
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
      {!isText && canUseEvidenceFileActions(evidence.file_path) && (
        <button
          onClick={(e) => { e.stopPropagation(); copyEvidenceImage(evidence.file_path) }}
          className="absolute top-2 right-10 z-10 p-1.5 rounded bg-black/50 text-white/80 hover:bg-black/70 hover:text-white cursor-pointer opacity-0 group-hover/ev:opacity-100 transition-opacity"
          title="Copiar imagem para a área de transferência"
          aria-label="Copiar imagem para a área de transferência"
        >
          <i className="fa-solid fa-copy text-xs" aria-hidden="true"></i>
        </button>
      )}
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
  const [confirmEvidenceDelete, setConfirmEvidenceDelete] = useState<string | null>(null)
  const [deletingEvidence, setDeletingEvidence] = useState(false)
  const [confirmActivityDelete, setConfirmActivityDelete] = useState(false)
  const [deletingActivity, setDeletingActivity] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [siblings, setSiblings] = useState<ActivityData[]>([])
  const [siblingsLoading, setSiblingsLoading] = useState(false)
  const [siblingsMonthReference, setSiblingsMonthReference] = useState('')
  const [selectedMonth, setSelectedMonth] = useState('')
  const [monthWithoutActivities, setMonthWithoutActivities] = useState<string | null>(null)
  const [textModalOpen, setTextModalOpen] = useState(false)
  const [textModalMode, setTextModalMode] = useState<'create' | 'edit' | 'view'>('view')
  const [textModalEvidence, setTextModalEvidence] = useState<EvidenceData | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )
  const evidenceCounts = getEvidenceTypeCounts(activity?.evidences)

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

  const fetchSiblingsByMonth = useCallback(async (monthReference: string) => {
    if (window.electronAPI) {
      return window.electronAPI.getActivities(monthReference)
    }

    return localDb.getActivities(monthReference)
  }, [])

  useEffect(() => {
    setSelectedMonth('')
    setSiblings([])
    setSiblingsMonthReference('')
    setMonthWithoutActivities(null)
  }, [id])

  useEffect(() => {
    if (
      shouldSyncSelectedMonthToActivity({
        currentId: id,
        activity,
        selectedMonth,
      })
    ) {
      setSelectedMonth(activity!.month_reference)
    }
  }, [activity, id, selectedMonth])

  useEffect(() => {
    if (!selectedMonth) return
    sessionStorage.setItem('shipit-selected-month', selectedMonth)
  }, [selectedMonth])

  // Fetch siblings for prev/next navigation based on selected month
  useEffect(() => {
    if (!selectedMonth) return
    let cancelled = false
    setSiblingsLoading(true)

    async function fetchSiblings() {
      try {
        const list = await fetchSiblingsByMonth(selectedMonth)

        if (!cancelled) {
          setSiblings(list)
          setSiblingsMonthReference(selectedMonth)
        }
      } finally {
        if (!cancelled) setSiblingsLoading(false)
      }
    }

    fetchSiblings()
    return () => {
      cancelled = true
    }
  }, [selectedMonth, fetchSiblingsByMonth])

  useEffect(() => {
    const decision = resolveMonthNavigation({
      currentId: id,
      activity,
      selectedMonth,
      siblings,
      siblingsMonthReference,
      siblingsLoading,
    })

    switch (decision.type) {
      case 'navigate':
        setMonthWithoutActivities(null)
        navigate(`/activities/${decision.targetId}`)
        return
      case 'show-empty-month':
        setMonthWithoutActivities(decision.monthReference)
        return
      case 'clear-empty-month':
        setMonthWithoutActivities(null)
        return
      case 'noop':
      default:
        return
    }
  }, [selectedMonth, siblingsLoading, siblingsMonthReference, siblings, activity, id, navigate])

  // Keyboard shortcuts: ← / → (local navigation in detail page)
  useEffect(() => {
    if (!activity || siblings.length === 0) return

    const currentIndex = siblings.findIndex((a) => a.id === activity.id)

    function getNavigationTarget(key: 'ArrowLeft' | 'ArrowRight'): ActivityData | null {
      if (currentIndex === -1) {
        if (key === 'ArrowLeft') {
          return siblings[siblings.length - 1] ?? null
        }

        return siblings[0] ?? null
      }

      if (key === 'ArrowLeft' && currentIndex > 0) {
        return siblings[currentIndex - 1]
      }

      if (key === 'ArrowRight' && currentIndex < siblings.length - 1) {
        return siblings[currentIndex + 1]
      }

      return null
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return
      if (isTypingTarget(e.target)) return

      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
      const target = getNavigationTarget(e.key)
      if (!target) return

      e.preventDefault()
      navigate(`/activities/${target.id}`)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activity, siblings, navigate])

  useEffect(() => {
    if (!confirmActivityDelete) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape' || deletingActivity) return
      e.preventDefault()
      setConfirmActivityDelete(false)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [confirmActivityDelete, deletingActivity])

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
    setDeletingEvidence(true)
    try {
      const success = window.electronAPI
        ? await window.electronAPI.deleteEvidence(evidenceId)
        : localDb.deleteEvidence(evidenceId)

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
      setDeletingEvidence(false)
      setConfirmEvidenceDelete(null)
    }
  }

  function handleChangeMonth(delta: number) {
    const baseMonth = selectedMonth || activity?.month_reference || getCurrentMonthRef()
    const nextMonth = shiftMonthReference(baseMonth, delta)

    setMonthWithoutActivities(null)
    setSelectedMonth(nextMonth)
  }

  async function handleDeleteActivity() {
    if (!activity) return

    const monthToRedirect = selectedMonth || activity.month_reference
    setDeletingActivity(true)

    try {
      const success = window.electronAPI
        ? await window.electronAPI.deleteActivity(activity.id)
        : localDb.deleteActivity(activity.id)

      if (!success) {
        toast.error('Erro ao excluir atividade')
        return
      }

      toast.success('Atividade excluída')
      navigate(`/activities?month=${monthToRedirect}`)
    } catch {
      toast.error('Erro ao excluir atividade')
    } finally {
      setDeletingActivity(false)
      setConfirmActivityDelete(false)
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
          className="btn btn-primary mt-4"
        >
          Voltar
        </button>
      </div>
    )
  }

  const links = parseLinks(activity.link_ref)
  const svnReleases = parseSvnReleasesStored(activity.svn_releases)
  const activeMonthReference = selectedMonth || activity.month_reference
  const showEmptyMonthState = monthWithoutActivities === activeMonthReference
  const showMonthLoadingState = siblingsLoading && activeMonthReference !== activity.month_reference

  return (
    <div id="activity-detail" className="max-w-6xl mx-auto">
      {/* Header */}
      <div id="activity-detail-header" className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            id="activity-detail-btn-back"
            onClick={() => navigate(`/activities?month=${activeMonthReference}`)}
            className="btn btn-ghost btn-icon hover:text-foreground"
            title="Voltar"
            aria-label="Voltar para lista de atividades"
          >
            <i className="fa-solid fa-arrow-left text-lg" aria-hidden="true"></i>
          </button>
          <h1 className="text-2xl font-bold">Detalhes da Atividade</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            id="activity-detail-btn-edit"
            onClick={() => navigate(`/activities/${activity.id}/edit`)}
            className="btn btn-primary"
          >
            <i className="fa-solid fa-pen-to-square"></i>
            Editar
          </button>
          <button
            id="activity-detail-btn-delete"
            onClick={() => setConfirmActivityDelete(true)}
            className="btn btn-outline-destructive"
            aria-label="Excluir atividade"
          >
            <i className="fa-solid fa-trash-can" aria-hidden="true"></i>
            Excluir
          </button>
        </div>
      </div>

      {/* Top navigation */}
      <div id="activity-detail-nav" className="mb-4">
        <ActivityNav
          siblings={siblings}
          currentId={activity.id}
          selectedMonth={activeMonthReference}
          onChangeMonth={handleChangeMonth}
        />
      </div>

      {/* Info card */}
      {showMonthLoadingState ? (
        <div className="bg-card border border-border rounded-lg p-8 text-center space-y-3">
          <i className="fa-solid fa-spinner fa-spin text-2xl text-muted-foreground" aria-hidden="true"></i>
          <p className="text-sm text-muted-foreground">
            Carregando atividades de {activeMonthReference}...
          </p>
        </div>
      ) : showEmptyMonthState ? (
        <div
          id="activity-detail-empty-month"
          className="bg-card border border-border rounded-lg p-8 text-center space-y-3"
          role="status"
          aria-live="polite"
        >
          <i className="fa-regular fa-calendar-xmark text-3xl text-muted-foreground" aria-hidden="true"></i>
          <h2 className="text-lg font-semibold">Mês sem atividades cadastradas</h2>
          <p className="text-sm text-muted-foreground">
            Não há atividades cadastradas para {activeMonthReference}.
          </p>
        </div>
      ) : (
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
          {isRichTextEmpty(activity.description) ? (
            <span className="text-muted-foreground italic">Sem descrição</span>
          ) : (
            <div
              className="prose prose-sm max-w-none text-foreground leading-relaxed
                [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6
                [&_li]:my-1 [&_p]:my-1 [&_strong]:font-bold [&_em]:italic"
              dangerouslySetInnerHTML={{ __html: normalizeToHtml(activity.description) }}
            />
          )}
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

        {/* Releases SVN */}
        {svnReleases.length > 0 && (
          <div id="activity-detail-svn-releases">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">
              Releases SVN (uso interno)
            </h3>
            <div className="flex flex-wrap gap-2">
              {svnReleases.map((release) => (
                <button
                  type="button"
                  key={release}
                  onClick={() => copyTextToClipboard(release, `Release ${release}`)}
                  className="group/rel inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 cursor-pointer transition-colors"
                  title="Copiar número de release"
                  aria-label={`Copiar release ${release}`}
                >
                  {release}
                  <i className="fa-solid fa-copy text-[10px] opacity-0 group-hover/rel:opacity-100 transition-opacity" aria-hidden="true"></i>
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Este campo nao e exportado para o relatorio DOCX.
            </p>
          </div>
        )}

        {/* Evidences */}
        <div
          id="activity-detail-evidence"
          onDragOver={(e) => { e.preventDefault(); setDropActive(true) }}
          onDragLeave={() => setDropActive(false)}
          onDrop={handleFileDrop}
        >
          <h3 className="text-sm font-medium text-muted-foreground mb-3 flex flex-wrap items-center gap-2">
            <span>Evidências</span>
            <span
              className="text-xs font-normal inline-flex items-center gap-2"
              aria-label={`${evidenceCounts.imageCount} imagens e ${evidenceCounts.textCount} evidências de texto`}
            >
              <span className="inline-flex items-center gap-1" title="Imagens">
                <i className="fa-solid fa-image text-[10px]" aria-hidden="true"></i>
                {evidenceCounts.imageCount}
              </span>
              <span className="inline-flex items-center gap-1" title="Textos">
                <i className="fa-solid fa-file-lines text-[10px]" aria-hidden="true"></i>
                {evidenceCounts.textCount}
              </span>
            </span>
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
                      className="btn btn-outline btn-sm"
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
                          onDelete={(id) => setConfirmEvidenceDelete(id)}
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
                      className="btn btn-outline btn-sm"
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
      )}

      {/* Bottom navigation */}
      <div className="mt-4">
        <ActivityNav
          siblings={siblings}
          currentId={activity.id}
          selectedMonth={activeMonthReference}
          onChangeMonth={handleChangeMonth}
        />
      </div>

      {/* Confirm activity delete modal */}
      {confirmActivityDelete && (
        <div
          id="activity-detail-delete-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => !deletingActivity && setConfirmActivityDelete(false)}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="activity-detail-delete-title"
        >
          <div
            className="bg-card border border-border rounded-lg p-6 shadow-xl max-w-sm w-full mx-4 animate-modal-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4 text-destructive">
              <i className="fa-solid fa-triangle-exclamation text-xl" aria-hidden="true"></i>
              <h2 id="activity-detail-delete-title" className="text-lg font-semibold">Excluir atividade?</h2>
            </div>
            <p className="text-muted-foreground mb-6">
              Esta ação removerá a atividade e suas evidências de forma permanente.
            </p>
            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => setConfirmActivityDelete(false)}
                disabled={deletingActivity}
                className="btn btn-outline"
              >
                Cancelar
              </button>
              <button
                id="activity-detail-confirm-delete"
                onClick={handleDeleteActivity}
                disabled={deletingActivity}
                className="btn btn-destructive"
              >
                {deletingActivity ? (
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

      {/* Confirm evidence delete modal */}
      {confirmEvidenceDelete && (
        <div
          id="activity-detail-evidence-delete-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setConfirmEvidenceDelete(null)}
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
                onClick={() => setConfirmEvidenceDelete(null)}
                disabled={deletingEvidence}
                className="btn btn-outline"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDeleteEvidence(confirmEvidenceDelete)}
                disabled={deletingEvidence}
                className="btn btn-destructive"
              >
                {deletingEvidence ? (
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
              filePath: ev.file_path && !ev.file_path.startsWith('data:') ? ev.file_path : undefined,
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
