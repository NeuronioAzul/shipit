import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { ActivityData } from '../vite-env'
import { localDb, getCurrentMonthRef } from '../services/localDb'
import { isActivityComplete } from '../utils/validation'

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

export function DashboardPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [activities, setActivities] = useState<ActivityData[]>([])
  const [loading, setLoading] = useState(true)

  const monthRef = searchParams.get('month') || getCurrentMonthRef()

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

  function formatDate(d: string | null): string {
    if (!d) return '—'
    return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  }

  const [mm, yyyy] = monthRef.split('/')
  const monthName = new Date(parseInt(yyyy), parseInt(mm) - 1).toLocaleDateString(
    'pt-BR',
    { month: 'long', year: 'numeric' }
  )

  // Summary stats
  const total = activities.length
  const concluidas = activities.filter((a) => a.status === 'Concluído').length
  const emAndamento = activities.filter((a) => a.status === 'Em andamento').length
  const canceladas = activities.filter((a) => a.status === 'Cancelado').length
  const pendentes = activities.filter((a) => a.status === 'Pendente').length
  const incompletas = activities.filter((a) => !isActivityComplete(a)).length

  const summaryCards = [
    { label: 'Total', value: total, icon: 'fa-list-check', color: 'text-foreground', bg: 'bg-muted' },
    { label: 'Concluídas', value: concluidas, icon: 'fa-check-circle', color: 'text-success', bg: 'bg-success/10' },
    { label: 'Em Andamento', value: emAndamento, icon: 'fa-spinner', color: 'text-primary', bg: 'bg-brand-blue/10' },
    { label: 'Pendentes', value: pendentes, icon: 'fa-clock', color: 'text-warning-foreground', bg: 'bg-warning/10' },
    { label: 'Canceladas', value: canceladas, icon: 'fa-times-circle', color: 'text-destructive', bg: 'bg-destructive/10' },
  ]

  // Gantt chart data
  const daysInMonth = new Date(parseInt(yyyy), parseInt(mm), 0).getDate()

  function getActivityDays(activity: ActivityData): { start: number; end: number } | null {
    if (!activity.date_start || !activity.date_end) return null
    const s = new Date(activity.date_start + 'T00:00:00')
    const e = new Date(activity.date_end + 'T00:00:00')
    const monthStart = new Date(parseInt(yyyy), parseInt(mm) - 1, 1)
    const monthEnd = new Date(parseInt(yyyy), parseInt(mm), 0)

    const clampStart = s < monthStart ? 1 : s.getDate()
    const clampEnd = e > monthEnd ? daysInMonth : e.getDate()

    if (clampStart > daysInMonth || clampEnd < 1) return null
    return { start: Math.max(1, clampStart), end: Math.min(daysInMonth, clampEnd) }
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/activities/new?month=${monthRef}`)}
            className="px-4 py-2 bg-accent text-accent-foreground font-semibold rounded-lg
              hover:opacity-90 transition-all cursor-pointer shadow-md flex items-center gap-2"
          >
            <i className="fa-solid fa-plus"></i>
            Nova Atividade
          </button>
          <button
            onClick={() => navigate('/profile')}
            className="px-3 py-2 border border-border text-foreground rounded-lg
              hover:bg-muted transition-colors cursor-pointer"
            title="Configurações"
          >
            <i className="fa-solid fa-gear"></i>
          </button>
        </div>
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

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-12">
          <i className="fa-solid fa-spinner fa-spin text-3xl text-muted-foreground"></i>
        </div>
      )}

      {!loading && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
            {summaryCards.map((card) => (
              <div
                key={card.label}
                className={`${card.bg} rounded-lg p-4 flex flex-col items-center gap-1`}
              >
                <i className={`fa-solid ${card.icon} text-lg ${card.color}`}></i>
                <span className={`text-2xl font-bold ${card.color}`}>{card.value}</span>
                <span className="text-xs text-muted-foreground">{card.label}</span>
              </div>
            ))}
          </div>

          {/* Incomplete warning */}
          {incompletas > 0 && (
            <div className="mb-4 p-3 bg-warning/10 border border-warning/30 rounded-lg text-warning-foreground flex items-center gap-2 text-sm">
              <i className="fa-solid fa-triangle-exclamation"></i>
              <span>
                {incompletas} atividade{incompletas > 1 ? 's' : ''} com campos obrigatórios não preenchidos.
                Preencha antes de gerar o relatório.
              </span>
            </div>
          )}

          {/* Gantt chart */}
          {activities.length > 0 && (
            <div className="bg-card border border-border rounded-lg p-4 mb-6 overflow-x-auto">
              <h2 className="text-sm font-semibold text-muted-foreground mb-3">
                <i className="fa-solid fa-chart-gantt mr-1"></i>
                Linha do Tempo
              </h2>
              <div className="min-w-[600px]">
                {/* Day headers */}
                <div className="flex items-center mb-1" style={{ paddingLeft: '140px' }}>
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => (
                    <div
                      key={day}
                      className="text-[9px] text-muted-foreground text-center"
                      style={{ width: `${100 / daysInMonth}%` }}
                    >
                      {day % 5 === 0 || day === 1 ? day : ''}
                    </div>
                  ))}
                </div>

                {/* Activity bars */}
                {activities.map((activity, idx) => {
                  const days = getActivityDays(activity)
                  const barColor = activity.status === 'Concluído'
                    ? 'bg-success'
                    : activity.status === 'Cancelado'
                      ? 'bg-destructive'
                      : activity.status === 'Em andamento'
                        ? 'bg-primary'
                        : 'bg-warning'

                  return (
                    <div key={activity.id} className="flex items-center h-7 group">
                      <div
                        className="w-[140px] shrink-0 text-xs text-foreground truncate pr-2 cursor-pointer hover:text-primary"
                        title={activity.description}
                        onClick={() => navigate(`/activities/${activity.id}`)}
                      >
                        {idx + 1}. {activity.description?.substring(0, 18) || 'Sem desc.'}
                      </div>
                      <div className="flex-1 relative h-5 bg-muted/30 rounded-sm">
                        {days && (
                          <div
                            className={`absolute top-0.5 h-4 rounded-sm ${barColor} opacity-80 hover:opacity-100 transition-opacity cursor-pointer`}
                            style={{
                              left: `${((days.start - 1) / daysInMonth) * 100}%`,
                              width: `${((days.end - days.start + 1) / daysInMonth) * 100}%`,
                            }}
                            title={`${activity.description}\n${formatDate(activity.date_start)} → ${formatDate(activity.date_end)}`}
                            onClick={() => navigate(`/activities/${activity.id}`)}
                          />
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Activity table */}
          {activities.length > 0 ? (
            <div className="bg-card border border-border rounded-lg overflow-hidden mb-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">#</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Descrição</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Período</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Status</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Atendimento</th>
                    <th className="text-center px-4 py-2.5 font-medium text-muted-foreground">
                      <i className="fa-solid fa-image"></i>
                    </th>
                    <th className="px-4 py-2.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {activities.map((activity, idx) => (
                    <tr
                      key={activity.id}
                      className="border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {idx + 1}
                        {!isActivityComplete(activity) && (
                          <i
                            className="fa-solid fa-triangle-exclamation text-warning-foreground text-[10px] ml-1"
                            title="Campos obrigatórios não preenchidos"
                          ></i>
                        )}
                      </td>
                      <td className="px-4 py-2.5 max-w-xs truncate">
                        <span
                          className="cursor-pointer hover:text-primary transition-colors"
                          onClick={() => navigate(`/activities/${activity.id}`)}
                        >
                          {activity.description || <span className="text-muted-foreground italic">Sem descrição</span>}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                        {formatDate(activity.date_start)} — {formatDate(activity.date_end)}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1 ${STATUS_COLORS[activity.status] || ''}`}
                        >
                          <i className={`fa-solid ${STATUS_ICONS[activity.status] || ''} text-[10px]`}></i>
                          {activity.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {activity.attendance_type || '—'}
                      </td>
                      <td className="px-4 py-2.5 text-center text-muted-foreground">
                        {activity.evidences?.length || 0}
                      </td>
                      <td className="px-4 py-2.5">
                        <button
                          onClick={() => navigate(`/activities/${activity.id}/edit`)}
                          className="p-1 rounded hover:bg-muted transition-colors cursor-pointer text-muted-foreground hover:text-foreground"
                          title="Editar"
                        >
                          <i className="fa-solid fa-pen-to-square text-xs"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
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

          {/* Generate report button */}
          {activities.length > 0 && (
            <div className="flex justify-center">
              <button
                disabled={incompletas > 0}
                className="px-6 py-3 bg-accent text-accent-foreground font-semibold rounded-lg
                  hover:opacity-90 transition-all cursor-pointer shadow-lg flex items-center gap-2
                  disabled:opacity-40 disabled:cursor-not-allowed"
                title={incompletas > 0 ? 'Preencha todas as atividades antes de gerar o relatório' : 'Gerar relatório mensal'}
                onClick={() => {
                  // Phase 3: PDF/DOCX generation
                  alert('Funcionalidade de geração de relatório será implementada na Fase 3.')
                }}
              >
                <i className="fa-solid fa-file-pdf text-lg"></i>
                Gerar Relatório — {monthName}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
