import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'

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
  squad_project_application: string
  mode: 'dark' | 'light'
}

const initialForm: ProfileForm = {
  full_name: '',
  role: '',
  seniority_level: '',
  contract_identifier: '',
  profile_type: '',
  correlating_activities: '',
  attendance_type: '',
  squad_project_application: '',
  mode: 'dark',
}

export function ProfilePage() {
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()
  const [form, setForm] = useState<ProfileForm>({ ...initialForm, mode: theme })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

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
          full_name: profile.full_name || '',
          role: profile.role || '',
          seniority_level: profile.seniority_level || '',
          contract_identifier: profile.contract_identifier || '',
          profile_type: profile.profile_type || '',
          correlating_activities: profile.correlating_activities || '',
          attendance_type: profile.attendance_type || '',
          squad_project_application: profile.squad_project_application || '',
          mode: profile.mode || 'dark',
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
    setForm((prev) => ({ ...prev, [name]: value }))

    if (name === 'mode') {
      setTheme(value as 'dark' | 'light')
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)

    try {
      if (window.electronAPI) {
        await window.electronAPI.saveUserProfile(form)
      } else {
        localStorage.setItem('shipit-profile', JSON.stringify(form))
      }
      setSaved(true)
      setTimeout(() => {
        navigate('/')
      }, 1200)
    } finally {
      setSaving(false)
    }
  }

  const inputClass =
    'w-full px-3 py-2 bg-card text-foreground border border-border rounded-lg ' +
    'focus:outline-none focus:ring-2 focus:ring-ring transition-colors'

  const labelClass = 'block text-sm font-medium text-foreground mb-1'

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/')}
          className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          title="Voltar"
        >
          <i className="fa-solid fa-arrow-left text-lg"></i>
        </button>
        <h1 className="text-2xl font-bold">
          {isEditing ? 'Editar Perfil' : 'Configurações Iniciais'}
        </h1>
      </div>

      {saved && (
        <div className="mb-4 p-3 bg-success/10 border border-success/30 rounded-lg text-success flex items-center gap-2">
          <i className="fa-solid fa-check-circle"></i>
          <span>Perfil salvo com sucesso!</span>
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
            placeholder="Ex: Maria Silva de Souza e Silva"
            className={inputClass}
          />
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
              className={inputClass}
            >
              <option value="">Selecione o cargo</option>
              {ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
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
              className={inputClass}
            >
              <option value="">Selecione a senioridade</option>
              {SENIORITY_LEVELS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
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
            className={inputClass}
          />
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
              className={inputClass}
            >
              <option value="">Selecione o perfil</option>
              {PROFILE_TYPES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
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
              className={inputClass}
            >
              <option value="">Selecione</option>
              {ATTENDANCE_TYPES.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Squad/Projeto/Aplicação */}
        <div>
          <label htmlFor="squad_project_application" className={labelClass}>
            Squad / Projeto / Aplicação <span className="text-destructive">*</span>
          </label>
          <input
            id="squad_project_application"
            name="squad_project_application"
            type="text"
            required
            value={form.squad_project_application}
            onChange={handleChange}
            placeholder="Ex: Squad SESU / Projeto PNAES"
            className={inputClass}
          />
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
            className={inputClass + ' resize-y'}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Copie do arquivo modelo que você recebeu.
          </p>
        </div>

        {/* Modo (Dark/Light) */}
        <div>
          <label className={labelClass}>Aparência</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="mode"
                value="dark"
                checked={form.mode === 'dark'}
                onChange={handleChange}
                className="accent-accent"
              />
              <i className="fa-solid fa-moon text-muted-foreground"></i>
              <span className="text-sm">Modo Escuro</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="mode"
                value="light"
                checked={form.mode === 'light'}
                onChange={handleChange}
                className="accent-accent"
              />
              <i className="fa-solid fa-sun text-muted-foreground"></i>
              <span className="text-sm">Modo Claro</span>
            </label>
          </div>
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
