import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import type { UserProfileData } from '../vite-env'
import { validateProfile, type ValidationError } from '../utils/validation'
import { Select } from '../components/Select'
import { registerSaveContextHandler, type SaveContextResult } from '../menu/saveContextRegistry'

const ROLES = [
  'ADMINISTRADOR DE DADOS',
  'ANALISTA DE DADOS E BUSINESS INTELLIGENCE',
  'ANALISTA DE QUALIDADE E TESTES DE SOFTWARE',
  'ANALISTA DE REQUISITOS',
  'ARQUITETO DE DADOS',
  'ARQUITETO DE SOFTWARE',
  'ARQUITETO DE SOFTWARE DEVOPS',
  'ENGENHEIRO DE AUTOMAÇÃO',
  'CIENTISTA DE DADOS',
  'ENGENHEIRO DE SOFTWARE',
  'ENGENHEIRO DE DADOS',
] as const

const SENIORITY_LEVELS = [
  'Aprendiz',
  'Júnior',
  'Pleno',
  'Sênior',
  'Especialista',
  'Líder',
  'Master',
] as const

const PROFILE_TYPES = [
  'DEV-01', 'DEV-02', 'DEV-03', 'DEV-04', 'DEV-05',
  'DEV-06', 'DEV-07', 'DEV-08', 'DEV-09', 'DEV-10',
] as const

const ATTENDANCE_TYPES = ['Presencial', 'Remoto', 'Híbrido'] as const

const NUMERIC_PROFILE_FIELDS = [
  'daily_availability',
  'monthly_availability',
  'minimum_effort_hours',
] as const

type NumericProfileField = (typeof NUMERIC_PROFILE_FIELDS)[number]

interface ProfileForm {
  full_name: string
  role: string
  seniority_level: string
  contract_identifier: string
  profile_type: string
  correlating_activities: string
  attendance_type: string
  project_scope: string
  daily_availability: string
  monthly_availability: string
  minimum_effort_hours: string
}

const initialForm: ProfileForm = {
  full_name: '',
  role: '',
  seniority_level: '',
  contract_identifier: '',
  profile_type: '',
  correlating_activities: '',
  attendance_type: '',
  project_scope: '',
  daily_availability: '',
  monthly_availability: '',
  minimum_effort_hours: '',
}

function parseProfileInteger(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null

  const parsedValue = Number.parseInt(trimmed, 10)
  return Number.isNaN(parsedValue) ? null : parsedValue
}

function serializeProfileForm(form: ProfileForm): UserProfileData {
  return {
    full_name: form.full_name,
    role: form.role,
    seniority_level: form.seniority_level,
    contract_identifier: form.contract_identifier,
    profile_type: form.profile_type,
    correlating_activities: form.correlating_activities,
    attendance_type: form.attendance_type,
    project_scope: form.project_scope,
    daily_availability: parseProfileInteger(form.daily_availability),
    monthly_availability: parseProfileInteger(form.monthly_availability),
    minimum_effort_hours: parseProfileInteger(form.minimum_effort_hours),
  }
}

export function ProfilePage() {
  const navigate = useNavigate()
  const [form, setForm] = useState<ProfileForm>({ ...initialForm })
  const [saving, setSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [errors, setErrors] = useState<ValidationError[]>([])
  const savedFingerprintRef = useRef('')

  const buildProfileFingerprint = useCallback((nextForm: ProfileForm): string => {
    return JSON.stringify({
      full_name: nextForm.full_name.trim(),
      role: nextForm.role,
      seniority_level: nextForm.seniority_level,
      contract_identifier: nextForm.contract_identifier.trim(),
      profile_type: nextForm.profile_type,
      correlating_activities: nextForm.correlating_activities.trim(),
      attendance_type: nextForm.attendance_type,
      project_scope: nextForm.project_scope.trim(),
      daily_availability: nextForm.daily_availability.trim(),
      monthly_availability: nextForm.monthly_availability.trim(),
      minimum_effort_hours: nextForm.minimum_effort_hours.trim(),
    })
  }, [])

  const persistProfile = useCallback(async (nextForm: ProfileForm) => {
    const normalizedProfile = serializeProfileForm(nextForm)

    if (window.electronAPI) {
      await window.electronAPI.saveUserProfile(normalizedProfile)
    } else {
      localStorage.setItem('shipit-profile', JSON.stringify(normalizedProfile))
    }
    savedFingerprintRef.current = buildProfileFingerprint(nextForm)
  }, [buildProfileFingerprint])

  useEffect(() => {
    async function loadProfile() {
      let profile: UserProfileData | null = null
      if (window.electronAPI) {
        profile = await window.electronAPI.getUserProfile()
      } else {
        const stored = localStorage.getItem('shipit-profile')
        if (stored) profile = JSON.parse(stored) as UserProfileData
      }

      if (profile?.full_name) {
        const loadedForm: ProfileForm = {
          full_name: (profile.full_name || '').toUpperCase(),
          role: profile.role || '',
          seniority_level: profile.seniority_level || '',
          contract_identifier: profile.contract_identifier || '',
          profile_type: profile.profile_type || '',
          correlating_activities: profile.correlating_activities || '',
          attendance_type: profile.attendance_type || '',
          project_scope: profile.project_scope || '',
          daily_availability: profile.daily_availability != null ? String(profile.daily_availability) : '',
          monthly_availability: profile.monthly_availability != null ? String(profile.monthly_availability) : '',
          minimum_effort_hours: profile.minimum_effort_hours != null ? String(profile.minimum_effort_hours) : '',
        }
        setForm(loadedForm)
        savedFingerprintRef.current = buildProfileFingerprint(loadedForm)
        setIsEditing(true)
      } else {
        savedFingerprintRef.current = buildProfileFingerprint(initialForm)
      }
    }
    loadProfile()
  }, [buildProfileFingerprint])

  const handleContextSave = useCallback(async (): Promise<SaveContextResult> => {
    if (saving) {
      return {
        status: 'unavailable',
        message: 'O salvamento já está em andamento.',
      }
    }

    const currentFingerprint = buildProfileFingerprint(form)
    if (currentFingerprint === savedFingerprintRef.current) {
      return {
        status: 'no-changes',
        message: 'Nenhuma alteração para salvar no perfil.',
      }
    }

    const validationErrors = validateProfile(form)
    if (validationErrors.length > 0) {
      setErrors(validationErrors)
      return {
        status: 'unavailable',
        message: 'Preencha os campos obrigatórios do perfil.',
      }
    }

    setErrors([])
    setSaving(true)

    try {
      await persistProfile(form)
      return {
        status: 'saved',
        message: 'Perfil salvo com sucesso.',
      }
    } catch {
      return {
        status: 'error',
        message: 'Erro ao salvar perfil.',
      }
    } finally {
      setSaving(false)
    }
  }, [saving, buildProfileFingerprint, form, persistProfile])

  useEffect(() => {
    return registerSaveContextHandler(handleContextSave)
  }, [handleContextSave])

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target
    // Nome completo sempre em maiúsculas e sem números
    const finalValue = name === 'full_name'
      ? value.replace(/\d/g, '').toUpperCase()
      : NUMERIC_PROFILE_FIELDS.includes(name as NumericProfileField)
        ? value.replace(/\D/g, '')
        : value
    setForm((prev) => ({ ...prev, [name]: finalValue }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()

    const validationErrors = validateProfile(form)
    if (validationErrors.length > 0) {
      setErrors(validationErrors)
      return
    }
    setErrors([])
    setSaving(true)

    try {
      await persistProfile(form)
      toast.success('Perfil salvo com sucesso!')
      setTimeout(() => {
        navigate('/')
      }, 800)
    } catch {
      toast.error('Erro ao salvar perfil')
    } finally {
      setSaving(false)
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
      <div id="profile-header" className="flex items-center gap-3 mb-6">
        <button
          id="profile-btn-edit"
          onClick={() => navigate('/')}
          className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer rounded focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          title="Voltar"
          aria-label="Voltar ao Dashboard"
        >
          <i className="fa-solid fa-arrow-left text-lg" aria-hidden="true"></i>
        </button>
        <h1 className="text-2xl font-bold">
          {isEditing ? 'Editar Perfil' : 'Configurações Iniciais'}
        </h1>
      </div>

      {errors.length > 0 && (
        <div id="profile-errors" className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive">
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

      <form id="profile-form" onSubmit={handleSubmit} className="space-y-5">
        {/* Nome Completo */}
        <div>
          <label htmlFor="full_name" className={labelClass}>
            Nome Completo <span className="text-destructive">*</span>
          </label>
          <div className={frameClass('full_name')}>
            <input
              id="full_name"
              name="full_name"
              type="text"
              required
              value={form.full_name}
              onChange={handleChange}
              placeholder="Ex: MARIA SILVA DE SOUZA E SILVA"
              className={`${fieldClass('full_name')} uppercase`}
            />
          </div>
          {fieldError('full_name') && (
            <p className="text-xs text-destructive mt-1">{fieldError('full_name')}</p>
          )}
        </div>

        {/* Cargo e Senioridade - row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="role" className={labelClass}>
              Cargo <span className="text-destructive">*</span>
            </label>
            <Select
              id="role"
              name="role"
              value={form.role}
              onChange={(v) => setForm((prev) => ({ ...prev, role: v }))}
              options={[
                { value: '', label: 'Selecione o cargo' },
                ...ROLES.map((r) => ({ value: r, label: r })),
              ]}
              placeholder="Selecione o cargo"
              hasError={!!fieldError('role')}
            />
            {fieldError('role') && (
              <p className="text-xs text-destructive mt-1">{fieldError('role')}</p>
            )}
          </div>

          <div>
            <label htmlFor="seniority_level" className={labelClass}>
              Senioridade <span className="text-destructive">*</span>
            </label>
            <Select
              id="seniority_level"
              name="seniority_level"
              value={form.seniority_level}
              onChange={(v) => setForm((prev) => ({ ...prev, seniority_level: v }))}
              options={[
                { value: '', label: 'Selecione a senioridade' },
                ...SENIORITY_LEVELS.map((s) => ({ value: s, label: s })),
              ]}
              placeholder="Selecione a senioridade"
              hasError={!!fieldError('seniority_level')}
            />
            {fieldError('seniority_level') && (
              <p className="text-xs text-destructive mt-1">{fieldError('seniority_level')}</p>
            )}
          </div>
        </div>

        {/* Identificador do Contrato */}
        <div>
          <label htmlFor="contract_identifier" className={labelClass}>
            Identificador do Contrato <span className="text-destructive">*</span>
          </label>
          <div className={frameClass('contract_identifier')}>
            <input
              id="contract_identifier"
              name="contract_identifier"
              type="text"
              required
              value={form.contract_identifier}
              onChange={handleChange}
              placeholder="Ex: Contrato n° 06/2022 – Digisystem Serviços Especializados Ltda"
              className={fieldClass('contract_identifier')}
            />
          </div>
          {fieldError('contract_identifier') && (
            <p className="text-xs text-destructive mt-1">{fieldError('contract_identifier')}</p>
          )}
        </div>

        {/* Perfil e Tipo de Atendimento - row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="profile_type" className={labelClass}>
              Tipo de Perfil <span className="text-destructive">*</span>
            </label>
            <Select
              id="profile_type"
              name="profile_type"
              value={form.profile_type}
              onChange={(v) => setForm((prev) => ({ ...prev, profile_type: v }))}
              options={[
                { value: '', label: 'Selecione o perfil' },
                ...PROFILE_TYPES.map((p) => ({ value: p, label: p })),
              ]}
              placeholder="Selecione o perfil"
              hasError={!!fieldError('profile_type')}
            />
            {fieldError('profile_type') && (
              <p className="text-xs text-destructive mt-1">{fieldError('profile_type')}</p>
            )}
          </div>

          <div>
            <label htmlFor="attendance_type" className={labelClass}>
              Tipo de Atendimento <span className="text-destructive">*</span>
            </label>
            <Select
              id="attendance_type"
              name="attendance_type"
              value={form.attendance_type}
              onChange={(v) => setForm((prev) => ({ ...prev, attendance_type: v }))}
              options={[
                { value: '', label: 'Selecione' },
                ...ATTENDANCE_TYPES.map((a) => ({ value: a, label: a })),
              ]}
              placeholder="Selecione"
              hasError={!!fieldError('attendance_type')}
            />
            {fieldError('attendance_type') && (
              <p className="text-xs text-destructive mt-1">{fieldError('attendance_type')}</p>
            )}
          </div>
        </div>

        {/* Squad/Projeto/Aplicação */}
        <div>
          <label htmlFor="project_scope" className={labelClass}>
            Escopo: (Squad / Projeto / Aplicação) <span className="text-destructive">*</span>
          </label>
          <div className={frameClass('project_scope')}>
            <input
              id="project_scope"
              name="project_scope"
              type="text"
              required
              value={form.project_scope}
              onChange={handleChange}
              placeholder="Ex: Squad SESU / Projeto PNAES"
              className={fieldClass('project_scope')}
            />
          </div>
          {fieldError('project_scope') && (
            <p className="text-xs text-destructive mt-1">{fieldError('project_scope')}</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            Separe com vírgula caso atue em mais de um. Ex: Squad 2 / Projeto SIMEC, Squad SESU / Projeto PNAES
          </p>
        </div>

        {/* Atividades Correlatas */}
        <div>
          <label htmlFor="correlating_activities" className={labelClass}>
            Atividades Correlatas <span className="text-destructive">*</span>
          </label>
          <div className={frameClass('correlating_activities')}>
            <textarea
              id="correlating_activities"
              name="correlating_activities"
              required
              value={form.correlating_activities}
              onChange={handleChange}
              rows={4}
              placeholder="Texto explicativo para correlacionar as atividades do mês com o perfil..."
              className={fieldClass('correlating_activities') + ' resize-y'}
            />
          </div>
          {fieldError('correlating_activities') && (
            <p className="text-xs text-destructive mt-1">{fieldError('correlating_activities')}</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            Copie do arquivo modelo que você recebeu.
          </p>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="daily_availability" className={labelClass}>
                Disponibilidade Diária <span className="text-destructive">*</span>
              </label>
              <div className={frameClass('daily_availability')}>
                <input
                  id="daily_availability"
                  name="daily_availability"
                  type="number"
                  min="1"
                  step="1"
                  inputMode="numeric"
                  required
                  value={form.daily_availability}
                  onChange={handleChange}
                  placeholder="Ex: 8"
                  className={fieldClass('daily_availability')}
                />
              </div>
              {fieldError('daily_availability') && (
                <p className="text-xs text-destructive mt-1">{fieldError('daily_availability')}</p>
              )}
            </div>

            <div>
              <label htmlFor="monthly_availability" className={labelClass}>
                Disponibilidade Mensal <span className="text-destructive">*</span>
              </label>
              <div className={frameClass('monthly_availability')}>
                <input
                  id="monthly_availability"
                  name="monthly_availability"
                  type="number"
                  min="1"
                  step="1"
                  inputMode="numeric"
                  required
                  value={form.monthly_availability}
                  onChange={handleChange}
                  placeholder="Ex: 168"
                  className={fieldClass('monthly_availability')}
                />
              </div>
              {fieldError('monthly_availability') && (
                <p className="text-xs text-destructive mt-1">{fieldError('monthly_availability')}</p>
              )}
            </div>

            <div>
              <label htmlFor="minimum_effort_hours" className={labelClass}>
                Esforço Mínimo em Horas <span className="text-destructive">*</span>
              </label>
              <div className={frameClass('minimum_effort_hours')}>
                <input
                  id="minimum_effort_hours"
                  name="minimum_effort_hours"
                  type="number"
                  min="1"
                  step="1"
                  inputMode="numeric"
                  required
                  value={form.minimum_effort_hours}
                  onChange={handleChange}
                  placeholder="Ex: 40"
                  className={fieldClass('minimum_effort_hours')}
                />
              </div>
              {fieldError('minimum_effort_hours') && (
                <p className="text-xs text-destructive mt-1">{fieldError('minimum_effort_hours')}</p>
              )}
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex gap-3 pt-2">
          <button
            id="profile-btn-submit"
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-accent text-accent-foreground font-semibold rounded-lg
              hover:opacity-90 transition-all cursor-pointer shadow-md
              disabled:opacity-50 disabled:cursor-not-allowed
              flex items-center gap-2"
          >
            {saving ? (
              <>
                <i className="fa-solid fa-spinner fa-spin"></i>
                Salvando...
              </>
            ) : (
              <>
                <i className="fa-solid fa-floppy-disk"></i>
                {isEditing ? 'Salvar Alterações' : 'Criar Perfil'}
              </>
            )}
          </button>

          <button
            id="profile-btn-cancel"
            type="button"
            onClick={() => navigate('/')}
            className="px-6 py-2.5 border border-border text-foreground rounded-lg
              hover:bg-muted transition-colors cursor-pointer"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}
