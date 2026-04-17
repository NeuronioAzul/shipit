import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import type { UserProfileData } from '../vite-env'
import { validateProfile, type ValidationError } from '../utils/validation'

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

interface ProfileForm {
  full_name: string
  role: string
  seniority_level: string
  contract_identifier: string
  profile_type: string
  correlating_activities: string
  attendance_type: string
  project_scope: string
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
}

export function ProfilePage() {
  const navigate = useNavigate()
  const [form, setForm] = useState<ProfileForm>({ ...initialForm })
  const [saving, setSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [errors, setErrors] = useState<ValidationError[]>([])

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
        setForm({
          full_name: (profile.full_name || '').toUpperCase(),
          role: profile.role || '',
          seniority_level: profile.seniority_level || '',
          contract_identifier: profile.contract_identifier || '',
          profile_type: profile.profile_type || '',
          correlating_activities: profile.correlating_activities || '',
          attendance_type: profile.attendance_type || '',
          project_scope: profile.project_scope || '',
        })
        setIsEditing(true)
      }
    }
    loadProfile()
  }, [])

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target
    // Nome completo sempre em maiúsculas e sem números
    const finalValue = name === 'full_name' ? value.replace(/\d/g, '').toUpperCase() : value
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
      if (window.electronAPI) {
        await window.electronAPI.saveUserProfile(form)
      } else {
        localStorage.setItem('shipit-profile', JSON.stringify(form))
      }
      toast.success('Perfil salvo com sucesso!')
      setTimeout(() => {
        navigate('/')
      }, 800)
    } catch (err) {
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

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button
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
        <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive">
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

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Nome Completo */}
        <div>
          <label htmlFor="full_name" className={labelClass}>
            Nome Completo <span className="text-destructive">*</span>
          </label>
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
            <select
              id="role"
              name="role"
              required
              value={form.role}
              onChange={handleChange}
              className={fieldClass('role')}
            >
              <option value="">Selecione o cargo</option>
              {ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            {fieldError('role') && (
              <p className="text-xs text-destructive mt-1">{fieldError('role')}</p>
            )}
          </div>

          <div>
            <label htmlFor="seniority_level" className={labelClass}>
              Senioridade <span className="text-destructive">*</span>
            </label>
            <select
              id="seniority_level"
              name="seniority_level"
              required
              value={form.seniority_level}
              onChange={handleChange}
              className={fieldClass('seniority_level')}
            >
              <option value="">Selecione a senioridade</option>
              {SENIORITY_LEVELS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
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
            <select
              id="profile_type"
              name="profile_type"
              required
              value={form.profile_type}
              onChange={handleChange}
              className={fieldClass('profile_type')}
            >
              <option value="">Selecione o perfil</option>
              {PROFILE_TYPES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            {fieldError('profile_type') && (
              <p className="text-xs text-destructive mt-1">{fieldError('profile_type')}</p>
            )}
          </div>

          <div>
            <label htmlFor="attendance_type" className={labelClass}>
              Tipo de Atendimento <span className="text-destructive">*</span>
            </label>
            <select
              id="attendance_type"
              name="attendance_type"
              required
              value={form.attendance_type}
              onChange={handleChange}
              className={fieldClass('attendance_type')}
            >
              <option value="">Selecione</option>
              {ATTENDANCE_TYPES.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
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
          {fieldError('correlating_activities') && (
            <p className="text-xs text-destructive mt-1">{fieldError('correlating_activities')}</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            Copie do arquivo modelo que você recebeu.
          </p>
        </div>

        {/* Submit */}
        <div className="flex gap-3 pt-2">
          <button
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
