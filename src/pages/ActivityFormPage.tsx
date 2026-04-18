import { useEffect, useState, useCallback, useRef, type FormEvent } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import type { ActivityData, EvidenceData } from '../vite-env'
import { localDb, getCurrentMonthRef } from '../services/localDb'
import { EvidenceUpload } from '../components/EvidenceUpload'
import { validateActivity, type ValidationError } from '../utils/validation'
import { DatePicker } from '../components/DatePicker'
import { Select } from '../components/Select'

const STATUSES = ['Em andamento', 'Concluído', 'Cancelado', 'Pendente'] as const
const ATTENDANCE_TYPES = ['Presencial', 'Remoto', 'Híbrido'] as const

interface ActivityForm {
  description: string
  date_start: string
  date_end: string
  status: string
  link_ref: string
  attendance_type: string
  month_reference: string
  project_scope: string
}

export function ActivityFormPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const isEditing = !!id

  const defaultMonth = searchParams.get('month') || getCurrentMonthRef()

  const [form, setForm] = useState<ActivityForm>({
    description: '',
    date_start: '',
    date_end: '',
    status: 'Pendente',
    link_ref: '',
    attendance_type: '',
    month_reference: defaultMonth,
    project_scope: '',
  })
  const [evidences, setEvidences] = useState<EvidenceData[]>([])
  const [activityId, setActivityId] = useState<string | null>(id || null)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<ValidationError[]>([])
  const [profileAttendance, setProfileAttendance] = useState<string>('')
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const initialLoadDone = useRef(false)

  // Load profile attendance and project_scope for defaults
  useEffect(() => {
    async function loadProfile() {
      let profile: { attendance_type?: string; project_scope?: string } | null = null
      if (window.electronAPI) {
        profile = await window.electronAPI.getUserProfile()
      } else {
        const stored = localStorage.getItem('shipit-profile')
        if (stored) profile = JSON.parse(stored)
      }
      if (profile?.attendance_type) {
        setProfileAttendance(profile.attendance_type)
        if (!isEditing) {
          setForm((prev) => ({
            ...prev,
            attendance_type: prev.attendance_type || profile!.attendance_type!,
            project_scope: prev.project_scope || profile!.project_scope || '',
          }))
        }
      }
    }
    loadProfile()
  }, [isEditing])

  // Load existing activity for edit mode
  const loadActivity = useCallback(async () => {
    if (!id) return
    let activity: ActivityData | null = null
    if (window.electronAPI) {
      activity = await window.electronAPI.getActivity(id)
    } else {
      activity = localDb.getActivity(id)
    }
    if (activity) {
      setForm({
        description: activity.description || '',
        date_start: activity.date_start || '',
        date_end: activity.date_end || '',
        status: activity.status,
        link_ref: activity.link_ref || '',
        attendance_type: activity.attendance_type || '',
        month_reference: activity.month_reference,
        project_scope: activity.project_scope || '',
      })
      setEvidences(activity.evidences || [])
      setActivityId(activity.id)
    }
  }, [id])

  useEffect(() => {
    loadActivity().then(() => {
      // Delay setting initialLoadDone to avoid auto-save on first render
      setTimeout(() => { initialLoadDone.current = true }, 100)
    })
  }, [loadActivity])

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setAutoSaveStatus('idle')
  }

  // Auto-save: debounce 2s after any form change (only if activity already has an id)
  useEffect(() => {
    if (!initialLoadDone.current) return
    if (saving) return

    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)

    autoSaveTimer.current = setTimeout(async () => {
      // Only auto-save if there's meaningful content
      if (!form.description.trim()) return

      setAutoSaveStatus('saving')
      try {
        const data: Partial<ActivityData> = {
          description: form.description,
          date_start: form.date_start || null,
          date_end: form.date_end || null,
          status: form.status as ActivityData['status'],
          link_ref: form.link_ref || null,
          attendance_type: (form.attendance_type as ActivityData['attendance_type']) || null,
          month_reference: form.month_reference,
          project_scope: form.project_scope || null,
        }
        if (activityId) data.id = activityId

        let result: ActivityData
        if (window.electronAPI) {
          result = await window.electronAPI.saveActivity(data)
        } else {
          result = localDb.saveActivity(data)
        }
        if (!activityId) setActivityId(result.id)
        setAutoSaveStatus('saved')
      } catch {
        setAutoSaveStatus('idle')
      }
    }, 2000)

    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()

    const validationErrors = validateActivity({
      description: form.description,
      date_start: form.date_start || null,
      date_end: form.date_end || null,
      status: form.status as ActivityData['status'],
      month_reference: form.month_reference,
    } as Partial<ActivityData>)

    if (validationErrors.length > 0) {
      setErrors(validationErrors)
      return
    }
    setErrors([])
    setSaving(true)

    try {
      const data: Partial<ActivityData> = {
        description: form.description,
        date_start: form.date_start || null,
        date_end: form.date_end || null,
        status: form.status as ActivityData['status'],
        link_ref: form.link_ref || null,
        attendance_type: (form.attendance_type as ActivityData['attendance_type']) || null,
        month_reference: form.month_reference,
        project_scope: form.project_scope || null,
      }

      if (activityId) data.id = activityId

      let savedActivity: ActivityData
      if (window.electronAPI) {
        savedActivity = await window.electronAPI.saveActivity(data)
      } else {
        savedActivity = localDb.saveActivity(data)
      }
      setActivityId(savedActivity.id)
      toast.success('Atividade salva com sucesso!')
      setTimeout(() => {
        navigate(`/activities?month=${form.month_reference}`)
      }, 600)
    } catch (err) {
      toast.error('Erro ao salvar atividade')
    } finally {
      setSaving(false)
    }
  }

  function handleEvidenceAdded(evidence: EvidenceData) {
    setEvidences((prev) => [...prev, evidence])
  }

  function handleTextEvidenceAdded(evidence: EvidenceData) {
    setEvidences((prev) => [...prev, evidence])
  }

  function handleTextEvidenceUpdated(id: string, textContent: string) {
    setEvidences((prev) => prev.map((e) => e.id === id ? { ...e, text_content: textContent } : e))
  }

  async function handleDeleteEvidence(evidenceId: string) {
    if (window.electronAPI) {
      await window.electronAPI.deleteEvidence(evidenceId)
      // Notify Header to update trash badge
      window.dispatchEvent(new Event('shipit:trash-changed'))
    } else {
      localDb.deleteEvidence(evidenceId)
    }
    setEvidences((prev) => prev.filter((e) => e.id !== evidenceId))
  }

  async function handleUpdateCaption(evidenceId: string, caption: string) {
    if (window.electronAPI) {
      await window.electronAPI.updateEvidenceCaption(evidenceId, caption)
    } else {
      localDb.updateEvidenceCaption(evidenceId, caption)
    }
    setEvidences((prev) =>
      prev.map((e) => (e.id === evidenceId ? { ...e, caption } : e))
    )
  }

  async function handleReorderEvidences(reordered: EvidenceData[]) {
    setEvidences(reordered)
    if (window.electronAPI) {
      const items = reordered.map((e, i) => ({ id: e.id, sort_index: i }))
      await window.electronAPI.reorderEvidences(items)
    }
  }

  const inputClass =
    'cyber-input w-full px-3 py-2 bg-card text-foreground border border-border rounded-lg ' +
    'focus:outline-none focus:ring-2 focus:ring-ring transition-colors'
  const inputErrorClass =
    'cyber-input cyber-input-error w-full px-3 py-2 bg-card text-foreground border border-destructive rounded-lg ' +
    'focus:outline-none focus:ring-2 focus:ring-destructive transition-colors'
  const labelClass = 'block text-sm font-medium text-foreground mb-1'

  function fieldError(field: string): string | undefined {
    return errors.find((e) => e.field === field)?.message
  }

  function fieldClass(field: string): string {
    return fieldError(field) ? inputErrorClass : inputClass
  }

  function frameClass(field: string): string {
    return 'cyber-input-frame' + (fieldError(field) ? ' cyber-frame-error' : '')
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div id="activity-form-header" className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            id="activity-form-btn-back"
            onClick={() => navigate(`/activities?month=${form.month_reference}`)}
            className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer rounded focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            title="Voltar"
            aria-label="Voltar para lista de atividades"
          >
            <i className="fa-solid fa-arrow-left text-lg" aria-hidden="true"></i>
          </button>
          <h1 className="text-2xl font-bold">
            {isEditing ? 'Editar Atividade' : 'Nova Atividade'}
          </h1>
        </div>

        {/* Auto-save indicator */}
        {autoSaveStatus === 'saving' && (
          <span id="activity-form-autosave" className="text-xs text-muted-foreground flex items-center gap-1">
            <i className="fa-solid fa-spinner fa-spin text-[10px]"></i>
            Salvando...
          </span>
        )}
        {autoSaveStatus === 'saved' && (
          <span className="text-xs text-success flex items-center gap-1">
            <i className="fa-solid fa-check text-[10px]"></i>
            Salvo automaticamente
          </span>
        )}
      </div>

      {errors.length > 0 && (
        <div id="activity-form-errors" className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive">
          <div className="flex items-center gap-2 font-medium mb-1">
            <i className="fa-solid fa-triangle-exclamation"></i>
            <span>Preencha os campos obrigatórios:</span>
          </div>
          <ul className="list-disc list-inside text-sm">
            {errors.map((err) => (
              <li key={err.field}>{err.message}</li>
            ))}
          </ul>
        </div>
      )}

      <form id="activity-form" onSubmit={handleSubmit} className="space-y-5">
        {/* Descrição */}
        <div>
          <label htmlFor="description" className={labelClass}>
            Descrição <span className="text-destructive">*</span>
          </label>
          <div className={frameClass('description')}>
            <textarea
              id="description"
              name="description"
              value={form.description}
              onChange={handleChange}
              onPaste={(e) => {
                const plain = e.clipboardData.getData('text/plain')
                if (plain) {
                  e.preventDefault()
                  const target = e.currentTarget
                  const start = target.selectionStart
                  const end = target.selectionEnd
                  const newValue = form.description.slice(0, start) + plain + form.description.slice(end)
                  setForm((prev) => ({ ...prev, description: newValue }))
                  setAutoSaveStatus('idle')
                  // Restore cursor position after React re-render
                  requestAnimationFrame(() => {
                    target.selectionStart = target.selectionEnd = start + plain.length
                  })
                }
              }}
              rows={5}
              placeholder="Descreva a atividade realizada..."
              className={fieldClass('description') + ' resize-y whitespace-pre-wrap'}
            />
          </div>
          {fieldError('description') && (
            <p className="text-xs text-destructive mt-1">{fieldError('description')}</p>
          )}
        </div>

        {/* Período */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="date_start" className={labelClass}>
              Data de Início <span className="text-destructive">*</span>
            </label>
            <DatePicker
              id="date_start"
              name="date_start"
              value={form.date_start}
              onChange={(v) => { setForm((prev) => ({ ...prev, date_start: v })); setAutoSaveStatus('idle') }}
              placeholder="dd/mm/aaaa"
              hasError={!!fieldError('date_start')}
            />
            {fieldError('date_start') && (
              <p className="text-xs text-destructive mt-1">{fieldError('date_start')}</p>
            )}
          </div>
          <div>
            <label htmlFor="date_end" className={labelClass}>
              Data de Término <span className="text-destructive">*</span>
            </label>
            <DatePicker
              id="date_end"
              name="date_end"
              value={form.date_end}
              onChange={(v) => { setForm((prev) => ({ ...prev, date_end: v })); setAutoSaveStatus('idle') }}
              placeholder="dd/mm/aaaa"
              hasError={!!fieldError('date_end')}
            />
            {fieldError('date_end') && (
              <p className="text-xs text-destructive mt-1">{fieldError('date_end')}</p>
            )}
          </div>
        </div>

        {/* Status + Atendimento + Mês */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="status" className={labelClass}>
              Status
            </label>
            <Select
              id="status"
              name="status"
              value={form.status}
              onChange={(v) => { setForm((prev) => ({ ...prev, status: v })); setAutoSaveStatus('idle') }}
              options={STATUSES.map((s) => ({ value: s, label: s }))}
              placeholder="Selecione"
            />
          </div>

          <div>
            <label htmlFor="attendance_type" className={labelClass}>
              Tipo de Atendimento
            </label>
            <Select
              id="attendance_type"
              name="attendance_type"
              value={form.attendance_type}
              onChange={(v) => { setForm((prev) => ({ ...prev, attendance_type: v })); setAutoSaveStatus('idle') }}
              options={[
                { value: '', label: profileAttendance ? `Padrão (${profileAttendance})` : 'Selecione' },
                ...ATTENDANCE_TYPES.map((a) => ({ value: a, label: a })),
              ]}
              placeholder={profileAttendance ? `Padrão (${profileAttendance})` : 'Selecione'}
            />
          </div>

          <div>
            <label htmlFor="month_reference" className={labelClass}>
              Mês de Referência <span className="text-destructive">*</span>
            </label>
            <div className={frameClass('month_reference')}>
              <input
                id="month_reference"
                name="month_reference"
                type="text"
                value={form.month_reference}
                onChange={handleChange}
                placeholder="MM/YYYY"
                pattern="\d{2}/\d{4}"
                className={fieldClass('month_reference')}
              />
            </div>
            {fieldError('month_reference') && (
              <p className="text-xs text-destructive mt-1">{fieldError('month_reference')}</p>
            )}
          </div>
        </div>

        {/* Links de Referência */}
        <div>
          <label htmlFor="project_scope" className={labelClass}>
            Escopo: (Squad / Projeto / Aplicação)
          </label>
          <div className="cyber-input-frame">
            <input
              id="project_scope"
              name="project_scope"
              type="text"
              value={form.project_scope}
              onChange={handleChange}
              placeholder="Ex: Squad SESU / Projeto PNAES"
              className={inputClass}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Agrupa atividades por projeto no relatório. Herdado do perfil, editável por atividade.
          </p>
        </div>

        {/* Links de Referência */}
        <div>
          <label htmlFor="link_ref" className={labelClass}>
            Links de Referência
          </label>
          <div className="cyber-input-frame">
            <textarea
              id="link_ref"
              name="link_ref"
              value={form.link_ref}
              onChange={handleChange}
              rows={2}
              placeholder="Cole os links aqui, um por linha (ex: https://gitlab.example.com/merge_request/123)"
              className={inputClass + ' resize-y'}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Insira um link por linha. GitLab, Jira, etc.
          </p>
        </div>

        {/* Evidências — só mostra se tiver activityId (precisa salvar a atividade primeiro) */}
        {activityId ? (
          <div id="activity-form-evidence">
            <label className={labelClass}>Evidências (Prints)</label>
            <EvidenceUpload
              activityId={activityId}
              evidences={evidences}
              onEvidenceAdded={handleEvidenceAdded}
              onEvidenceDeleted={handleDeleteEvidence}
              onCaptionUpdated={handleUpdateCaption}
              onReorder={handleReorderEvidences}
              onTextEvidenceAdded={handleTextEvidenceAdded}
              onTextEvidenceUpdated={handleTextEvidenceUpdated}
            />
          </div>
        ) : (
          <div className="p-4 border border-dashed border-border rounded-lg text-center text-muted-foreground bg-muted/30">
            <i className="fa-solid fa-image mr-2"></i>
            Salve a atividade primeiro para anexar evidências.
          </div>
        )}

        {/* Submit */}
        <div className="flex gap-3 pt-2">
          <button
            id="activity-form-btn-submit"
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-accent text-accent-foreground font-semibold rounded-lg
              hover:opacity-90 transition-all cursor-pointer shadow-md
              disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? (
              <>
                <i className="fa-solid fa-spinner fa-spin"></i>
                Salvando...
              </>
            ) : (
              <>
                <i className="fa-solid fa-floppy-disk"></i>
                {isEditing ? 'Salvar Alterações' : 'Criar Atividade'}
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => navigate(`/activities?month=${form.month_reference}`)}
            className="px-6 py-2.5
            bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/60 transition-colors cursor-pointer
              "
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}
