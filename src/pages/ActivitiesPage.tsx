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
import type { ActivityData } from '../vite-env'
import { localDb, getCurrentMonthRef } from '../services/localDb'
import { isActivityComplete } from '../utils/validation'
import { SkeletonActivityItem } from '../components/Skeleton'

const STATUS_COLORS: Record<string, string> = {
  'Em andamento': 'bg-brand-blue/15 text-primary',
  'Concluído': 'bg-success/15 text-success',
  'Cancelado': 'bg-destructive/15 text-destructive',
  'Pendente': 'bg-warning/15 text-warning-foreground',
}

const STATUS_ICONS: Record<string, string> = {
  'Em andamento': 'fa-spinner',
  'Concluído': 'fa-check-circle',
  'Cancelado': 'fa-times-circle',
  'Pendente': 'fa-clock',
}

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
        >
          <i className="fa-solid fa-grip-vertical"></i>
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
                className="text-xs px-2 py-0.5 rounded-full font-medium bg-warning/15 text-warning-foreground inline-flex items-center gap-1"
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
          >
            <i className="fa-solid fa-pen-to-square"></i>
          </button>
          <button
            onClick={() => onDelete(activity.id)}
            className="p-2 rounded hover:bg-destructive/10 transition-colors cursor-pointer text-muted-foreground hover:text-destructive"
            title="Excluir"
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
      if (window.electronAPI) {
        data = await window.electronAPI.getActivities(monthRef)
      } else {
        data = localDb.getActivities(monthRef)
      }
      setActivities(data)
    } finally {
      setLoading(false)
    }
  }, [monthRef])

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
          <h1 className="text-2xl font-bold">Atividades</h1>
        </div>

        <button
          onClick={() => navigate(`/activities/new?month=${monthRef}`)}
          className="px-4 py-2 bg-accent text-accent-foreground font-semibold rounded-lg
            hover:opacity-90 transition-all cursor-pointer shadow-md flex items-center gap-2"
        >
          <i className="fa-solid fa-plus"></i>
          Nova Atividade
        </button>
      </div>

      {/* Month selector */}
      <div className="flex items-center justify-center gap-4 mb-6 select-none">
        <button
          onClick={() => changeMonth(-1)}
          className="p-2 rounded-lg hover:bg-muted transition-colors cursor-pointer text-muted-foreground hover:text-foreground"
        >
          <i className="fa-solid fa-chevron-left"></i>
        </button>
        <span className="text-lg font-medium capitalize min-w-48 text-center">
          {monthName}
        </span>
        <button
          onClick={() => changeMonth(1)}
          className="p-2 rounded-lg hover:bg-muted transition-colors cursor-pointer text-muted-foreground hover:text-foreground"
        >
          <i className="fa-solid fa-chevron-right"></i>
        </button>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          <SkeletonActivityItem />
          <SkeletonActivityItem />
          <SkeletonActivityItem />
        </div>
      )}

      {/* Empty state */}
      {!loading && activities.length === 0 && (
        <div className="text-center py-16">
          <i className="fa-solid fa-clipboard-list text-5xl text-muted-foreground/30 mb-4"></i>
          <p className="text-muted-foreground text-lg">
            Nenhuma atividade registrada neste mês.
          </p>
          <button
            onClick={() => navigate(`/activities/new?month=${monthRef}`)}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg
              hover:opacity-90 transition-opacity cursor-pointer inline-flex items-center gap-2"
          >
            <i className="fa-solid fa-plus"></i>
            Registrar Atividade
          </button>
        </div>
      )}

      {/* Activity list */}
      {!loading && activities.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={activities.map(a => a.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {activities.map((activity, idx) => (
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-xl p-6 max-w-sm mx-4 shadow-2xl">
            <h3 className="text-lg font-semibold mb-2">Excluir Atividade</h3>
            <p className="text-muted-foreground mb-4">
              Tem certeza? Esta ação não pode ser desfeita. As evidências associadas também serão removidas.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:opacity-90 transition-opacity cursor-pointer"
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
