import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { ActivityData, ActivityStatus, AttendanceType } from '../vite-env'
import { localDb, getCurrentMonthRef } from '../services/localDb'
import { isActivityComplete } from '../utils/validation'
import { SkeletonActivityItem } from '../components/Skeleton'
import { STATUS_COLORS, STATUS_ICONS } from '../utils/statusColors'

function formatDateShort(d: string | null): string {
  if (!d) return '—'
  const date = new Date(d + 'T00:00:00')
  return date.toLocaleDateString('pt-BR')
}

function SortableActivityItem({
  activity,
  idx,
  onNavigate,
  onDelete,
}: {
  activity: ActivityData
  idx: number
  onNavigate: (path: string) => void
  onDelete: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: activity.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  }

  return (
    <div ref={setNodeRef} style={style} className="bg-card border border-border rounded-lg p-4 hover:shadow-md transition-shadow group">
      <div className="flex items-start justify-between gap-4">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="mt-1 p-1 cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-muted-foreground transition-colors touch-none"
          title="Arrastar para reordenar"
          aria-label="Arrastar para reordenar atividade"
        >
          <i className="fa-solid fa-grip-vertical" aria-hidden="true"></i>
        </button>

        <div
          className="flex-1 cursor-pointer"
          onClick={() => onNavigate(`/activities/${activity.id}`)}
        >
          <div className="flex items-center gap-3 mb-2">
            <span className="text-sm font-medium text-muted-foreground">
              Atividade {idx + 1}
            </span>
            {!isActivityComplete(activity) && (
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium bg-chart-4/15 text-chart-4 inline-flex items-center gap-1"
                title="Campos obrigatórios não preenchidos"
              >
                <i className="fa-solid fa-triangle-exclamation text-[10px]"></i>
                Incompleta
              </span>
            )}
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1 ${STATUS_COLORS[activity.status] || ''}`}
            >
              <i className={`fa-solid ${STATUS_ICONS[activity.status] || ''} text-[10px]`}></i>
              {activity.status}
            </span>
            {activity.evidences && activity.evidences.length > 0 && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <i className="fa-solid fa-image text-[10px]"></i>
                {activity.evidences.length}
              </span>
            )}
          </div>
          <p className="text-foreground line-clamp-2">
            {activity.description || <span className="text-muted-foreground italic">Sem descrição</span>}
          </p>
          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
            <span>
              <i className="fa-regular fa-calendar mr-1"></i>
              {formatDateShort(activity.date_start)} — {formatDateShort(activity.date_end)}
            </span>
            {activity.attendance_type && (
              <span>
                <i className="fa-solid fa-location-dot mr-1"></i>
                {activity.attendance_type}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onNavigate(`/activities/${activity.id}/edit`)}
            className="p-2 rounded hover:bg-muted transition-colors cursor-pointer text-muted-foreground hover:text-foreground"
            title="Editar"
            aria-label="Editar atividade"
          >
            <i className="fa-solid fa-pen-to-square" aria-hidden="true"></i>
          </button>
          <button
            onClick={() => onDelete(activity.id)}
            className="p-2 rounded hover:bg-destructive/10 transition-colors cursor-pointer text-muted-foreground hover:text-destructive"
            title="Excluir"
            aria-label="Excluir atividade"
          >
            <i className="fa-solid fa-trash-can"></i>
          </button>
        </div>
      </div>
    </div>
  )
}

export function ActivitiesPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [activities, setActivities] = useState<ActivityData[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  // Filter state
  const searchQuery = searchParams.get('search') || ''
  const [filterText, setFilterText] = useState(searchQuery)
  const [filterStatus, setFilterStatus] = useState<ActivityStatus | ''>('')
  const [filterAttendance, setFilterAttendance] = useState<AttendanceType | ''>('')
  const [filterScope, setFilterScope] = useState('')
  const [showFilters, setShowFilters] = useState(!!searchQuery)
  const isSearchMode = !!searchQuery

  const storedMonth = sessionStorage.getItem('shipit-selected-month')
  const monthRef = searchParams.get('month') || storedMonth || getCurrentMonthRef()

  // Persist selected month so it survives navigation across pages
  useEffect(() => {
    sessionStorage.setItem('shipit-selected-month', monthRef)
  }, [monthRef])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const loadActivities = useCallback(async () => {
    setLoading(true)
    try {
      let data: ActivityData[]
      if (isSearchMode && window.electronAPI) {
        data = await window.electronAPI.searchActivities(searchQuery)
      } else if (window.electronAPI) {
        data = await window.electronAPI.getActivities(monthRef)
      } else {
        data = localDb.getActivities(monthRef)
      }
      setActivities(data)
    } finally {
      setLoading(false)
    }
  }, [monthRef, isSearchMode, searchQuery])

  useEffect(() => {
    loadActivities()
  }, [loadActivities])

  function changeMonth(delta: number) {
    const [mm, yyyy] = monthRef.split('/')
    const d = new Date(parseInt(yyyy), parseInt(mm) - 1 + delta, 1)
    const newMonth = `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
    setSearchParams({ month: newMonth })
  }

  async function handleDelete(id: string) {
    try {
      if (window.electronAPI) {
        await window.electronAPI.deleteActivity(id)
      } else {
        localDb.deleteActivity(id)
      }
      toast.success('Atividade excluída')
    } catch {
      toast.error('Erro ao excluir atividade')
    }
    setDeleteId(null)
    loadActivities()
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = activities.findIndex(a => a.id === active.id)
    const newIndex = activities.findIndex(a => a.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(activities, oldIndex, newIndex)
    setActivities(reordered)

    const items = reordered.map((a, i) => ({ id: a.id, order: i }))
    if (window.electronAPI) {
      await window.electronAPI.reorderActivities(items)
    }
  }

  const [mm, yyyy] = monthRef.split('/')
  const monthName = new Date(parseInt(yyyy), parseInt(mm) - 1).toLocaleDateString(
    'pt-BR',
    { month: 'long', year: 'numeric' }
  )

  // Client-side filtering
  const filteredActivities = activities.filter(a => {
    if (filterText && !isSearchMode) {
      const lower = filterText.toLowerCase()
      const match = a.description?.toLowerCase().includes(lower) ||
        a.project_scope?.toLowerCase().includes(lower) ||
        a.link_ref?.toLowerCase().includes(lower)
      if (!match) return false
    }
    if (filterStatus && a.status !== filterStatus) return false
    if (filterAttendance && a.attendance_type !== filterAttendance) return false
    if (filterScope && !a.project_scope?.toLowerCase().includes(filterScope.toLowerCase())) return false
    return true
  })

  const hasActiveFilters = !!filterText || !!filterStatus || !!filterAttendance || !!filterScope

  function clearFilters() {
    setFilterText('')
    setFilterStatus('')
    setFilterAttendance('')
    setFilterScope('')
    if (isSearchMode) {
      const params = new URLSearchParams(searchParams)
      params.delete('search')
      setSearchParams(params)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title="Voltar"
          >
            <i className="fa-solid fa-arrow-left text-lg"></i>
          </button>
          <h1 className="text-2xl font-bold">
            {isSearchMode ? `Resultados para "${searchQuery}"` : 'Atividades'}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-2 rounded-lg border transition-colors cursor-pointer text-sm flex items-center gap-1.5 ${
              showFilters || hasActiveFilters
                ? 'bg-primary/10 border-primary/30 text-primary'
                : 'border-border text-muted-foreground hover:text-foreground hover:border-primary/30'
            }`}
            title="Filtros"
          >
            <i className="fa-solid fa-filter text-xs"></i>
            Filtros
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-accent"></span>
            )}
          </button>
          <button
            onClick={() => navigate(`/activities/new?month=${monthRef}`)}
            className="px-4 py-2 bg-accent text-accent-foreground font-semibold rounded-lg
              hover:opacity-90 transition-all cursor-pointer shadow-md flex items-center gap-2"
          >
            <i className="fa-solid fa-plus"></i>
            Nova Atividade
          </button>
        </div>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="bg-card border border-border rounded-lg p-4 mb-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Texto livre</label>
              <input
                type="text"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                placeholder="Buscar..."
                className="w-full px-3 py-1.5 text-sm bg-muted text-foreground border border-border rounded-lg"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as ActivityStatus | '')}
                className="w-full px-3 py-1.5 text-sm bg-muted text-foreground border border-border rounded-lg"
              >
                <option value="">Todos</option>
                <option value="Em andamento">Em andamento</option>
                <option value="Concluído">Concluído</option>
                <option value="Pendente">Pendente</option>
                <option value="Cancelado">Cancelado</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Atendimento</label>
              <select
                value={filterAttendance}
                onChange={(e) => setFilterAttendance(e.target.value as AttendanceType | '')}
                className="w-full px-3 py-1.5 text-sm bg-muted text-foreground border border-border rounded-lg"
              >
                <option value="">Todos</option>
                <option value="Presencial">Presencial</option>
                <option value="Remoto">Remoto</option>
                <option value="Híbrido">Híbrido</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Escopo: (Squad / Projeto / Aplicação)</label>
              <input
                type="text"
                value={filterScope}
                onChange={(e) => setFilterScope(e.target.value)}
                placeholder="Filtrar por escopo..."
                className="w-full px-3 py-1.5 text-sm bg-muted text-foreground border border-border rounded-lg"
              />
            </div>
          </div>
          {/* Active filter pills */}
          {hasActiveFilters && (
            <div className="flex items-center gap-2 flex-wrap">
              {filterText && (
                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-primary/10 text-primary rounded-full">
                  Texto: {filterText}
                  <button onClick={() => setFilterText('')} className="hover:text-destructive cursor-pointer"><i className="fa-solid fa-xmark"></i></button>
                </span>
              )}
              {filterStatus && (
                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-primary/10 text-primary rounded-full">
                  Status: {filterStatus}
                  <button onClick={() => setFilterStatus('')} className="hover:text-destructive cursor-pointer"><i className="fa-solid fa-xmark"></i></button>
                </span>
              )}
              {filterAttendance && (
                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-primary/10 text-primary rounded-full">
                  Atendimento: {filterAttendance}
                  <button onClick={() => setFilterAttendance('')} className="hover:text-destructive cursor-pointer"><i className="fa-solid fa-xmark"></i></button>
                </span>
              )}
              {filterScope && (
                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-primary/10 text-primary rounded-full">
                  Escopo: {filterScope}
                  <button onClick={() => setFilterScope('')} className="hover:text-destructive cursor-pointer"><i className="fa-solid fa-xmark"></i></button>
                </span>
              )}
              <button
                onClick={clearFilters}
                className="text-xs text-muted-foreground hover:text-foreground cursor-pointer underline"
              >
                Limpar filtros
              </button>
            </div>
          )}
        </div>
      )}

      {/* Month selector (hidden in search mode) */}
      {!isSearchMode && (
        <div className="flex items-center justify-center gap-4 mb-6 select-none">
          <button
            onClick={() => changeMonth(-1)}
            className="p-2 rounded-lg hover:bg-muted transition-colors cursor-pointer text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            aria-label="Mês anterior"
          >
            <i className="fa-solid fa-chevron-left" aria-hidden="true"></i>
          </button>
          <span className="text-lg font-medium capitalize min-w-48 text-center">
            {monthName}
          </span>
          <button
            onClick={() => changeMonth(1)}
            className="p-2 rounded-lg hover:bg-muted transition-colors cursor-pointer text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            aria-label="Próximo mês"
          >
            <i className="fa-solid fa-chevron-right" aria-hidden="true"></i>
          </button>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          <SkeletonActivityItem />
          <SkeletonActivityItem />
          <SkeletonActivityItem />
        </div>
      )}

      {/* Empty state */}
      {!loading && filteredActivities.length === 0 && (
        <div className="text-center py-16">
          <i className={`fa-solid ${hasActiveFilters ? 'fa-filter-circle-xmark' : 'fa-clipboard-list'} text-5xl text-muted-foreground/30 mb-4`}></i>
          <p className="text-muted-foreground text-lg">
            {hasActiveFilters
              ? 'Nenhuma atividade corresponde aos filtros.'
              : 'Nenhuma atividade registrada neste mês.'}
          </p>
          {hasActiveFilters ? (
            <button
              onClick={clearFilters}
              className="mt-4 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors cursor-pointer inline-flex items-center gap-2 text-sm"
            >
              <i className="fa-solid fa-xmark"></i>
              Limpar filtros
            </button>
          ) : (
            <button
              onClick={() => navigate(`/activities/new?month=${monthRef}`)}
              className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg
                hover:opacity-90 transition-opacity cursor-pointer inline-flex items-center gap-2"
            >
              <i className="fa-solid fa-plus"></i>
              Registrar Atividade
            </button>
          )}
        </div>
      )}

      {/* Activity list */}
      {!loading && filteredActivities.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={filteredActivities.map(a => a.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {filteredActivities.map((activity, idx) => (
                <SortableActivityItem
                  key={activity.id}
                  activity={activity}
                  idx={idx}
                  onNavigate={(path) => navigate(path)}
                  onDelete={(id) => setDeleteId(id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Delete confirmation modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" role="alertdialog" aria-modal="true" aria-labelledby="delete-activity-title">
          <div className="bg-card border border-border rounded-lg p-6 max-w-sm mx-4 shadow-2xl animate-modal-in">
            <h3 id="delete-activity-title" className="text-lg font-semibold mb-2">Excluir Atividade</h3>
            <p className="text-muted-foreground mb-4">
              Tem certeza? Esta ação não pode ser desfeita. As evidências associadas também serão removidas.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/60 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/60 transition-colors cursor-pointer"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
