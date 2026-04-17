import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ThemeSelector } from '../components/ThemeSelector'
import type { AppSettings, UpdateStatusData } from '../vite-env'

export function SettingsPage() {
  const navigate = useNavigate()
  const [reportsDir, setReportsDir] = useState('')
  const [defaultDir, setDefaultDir] = useState('')
  const [version, setVersion] = useState('')
  const [dirSaved, setDirSaved] = useState(false)
  const [sounds, setSounds] = useState<string[]>([])
  const [selectedSound, setSelectedSound] = useState('')
  const [soundSaved, setSoundSaved] = useState(false)
  const [autoLaunch, setAutoLaunch] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Alert config state
  const [alertEnabled, setAlertEnabled] = useState(true)
  const [alertDaysBefore, setAlertDaysBefore] = useState<number[]>([5, 3, 2, 1, 0])
  const [alertTime, setAlertTime] = useState('09:00')
  const [alertMessage, setAlertMessage] = useState('Lembrete: Preencha os campos obrigatórios para gerar o relatório mensal!')
  const [alertSoundEnabled, setAlertSoundEnabled] = useState(true)
  const [alertSaved, setAlertSaved] = useState(false)

  // Update state
  const [updateStatus, setUpdateStatus] = useState<UpdateStatusData>({ status: 'not-available' })
  const [isElectron] = useState(() => !!window.electronAPI)

  useEffect(() => {
    async function load() {
      if (!window.electronAPI) return
      const [settings, defDir, ver, soundList, isAutoLaunch, alertData] = await Promise.all([
        window.electronAPI.getSettings(),
        window.electronAPI.getDefaultReportsDir(),
        window.electronAPI.getVersion(),
        window.electronAPI.listSounds(),
        window.electronAPI.getAutoLaunch(),
        window.electronAPI.getAlert(),
      ])
      setDefaultDir(defDir)
      setReportsDir((settings as AppSettings).reportsDirectory || defDir)
      setVersion(ver)
      setSounds(soundList)
      setSelectedSound((settings as AppSettings).alertSound || '')
      setAutoLaunch(isAutoLaunch)

      if (alertData) {
        setAlertEnabled(alertData.alert_enabled)
        try { setAlertDaysBefore(JSON.parse(alertData.alert_days_before)) } catch { /* keep default */ }
        setAlertTime(alertData.alert_time || '09:00')
        setAlertMessage(alertData.alert_message || '')
        setAlertSoundEnabled(alertData.alert_sound_enabled)
      }
    }
    load()

    // Listen for sound data from main process
    let cleanupSound: (() => void) | undefined
    let cleanupUpdate: (() => void) | undefined
    if (window.electronAPI) {
      cleanupSound = window.electronAPI.onPlaySoundData((dataUrl) => {
        if (audioRef.current) {
          audioRef.current.pause()
        }
        const audio = new Audio(dataUrl)
        audioRef.current = audio
        audio.play().catch(() => {})
      })
      cleanupUpdate = window.electronAPI.onUpdateStatus((data) => {
        setUpdateStatus(data)
      })
    }

    return () => {
      cleanupSound?.()
      cleanupUpdate?.()
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  async function handleSelectDir() {
    if (!window.electronAPI) return
    const selected = await window.electronAPI.selectDirectory()
    if (selected) {
      setReportsDir(selected)
      await window.electronAPI.saveSettings({ reportsDirectory: selected })
      setDirSaved(true)
      setTimeout(() => setDirSaved(false), 2000)
    }
  }

  async function handleResetDir() {
    if (!window.electronAPI) return
    setReportsDir(defaultDir)
    await window.electronAPI.saveSettings({ reportsDirectory: undefined })
    setDirSaved(true)
    setTimeout(() => setDirSaved(false), 2000)
  }

  function handlePlaySound(filename: string) {
    if (!window.electronAPI) return
    window.electronAPI.playSound(filename)
  }

  async function handleSelectSound(filename: string) {
    if (!window.electronAPI) return
    setSelectedSound(filename)
    await window.electronAPI.saveSettings({ alertSound: filename || undefined })
    setSoundSaved(true)
    setTimeout(() => setSoundSaved(false), 2000)
  }

  async function handleToggleAutoLaunch() {
    if (!window.electronAPI) return
    const newVal = !autoLaunch
    const result = await window.electronAPI.setAutoLaunch(newVal)
    setAutoLaunch(result)
  }

  // Alert handlers
  const AVAILABLE_DAYS = [0, 1, 2, 3, 5, 7, 10, 14]

  function toggleAlertDay(day: number) {
    setAlertDaysBefore(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort((a, b) => b - a)
    )
  }

  async function handleSaveAlert() {
    if (!window.electronAPI) return
    await window.electronAPI.saveAlert({
      alert_enabled: alertEnabled,
      alert_days_before: JSON.stringify(alertDaysBefore),
      alert_time: alertTime,
      alert_message: alertMessage,
      alert_sound_enabled: alertSoundEnabled,
    })
    setAlertSaved(true)
    setTimeout(() => setAlertSaved(false), 2000)
  }

  async function handleCheckForUpdate() {
    if (!window.electronAPI) return
    setUpdateStatus({ status: 'checking' })
    const result = await window.electronAPI.checkForUpdate()
    if (result.status === 'dev') {
      setUpdateStatus({ status: 'dev' })
    }
  }

  async function handleInstallUpdate() {
    if (!window.electronAPI) return
    await window.electronAPI.installUpdate()
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
        <h1 className="text-2xl font-bold">Configurações</h1>
      </div>

      <div className="space-y-6">
        {/* Aparência */}
        <section className="bg-card border border-border rounded-lg p-5">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <i className="fa-solid fa-palette text-primary"></i>
            Aparência
          </h2>
          <ThemeSelector />
        </section>

        {/* Diretório de Relatórios */}
        <section className="bg-card border border-border rounded-lg p-5">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <i className="fa-solid fa-folder-open text-primary"></i>
            Diretório de Relatórios
          </h2>
          <p className="text-sm text-muted-foreground mb-3">
            Pasta onde os relatórios DOCX gerados serão salvos.
          </p>
          <div className="flex items-center gap-2 mb-3">
            <input
              type="text"
              readOnly
              value={reportsDir}
              className="cyber-input flex-1 px-3 py-2 bg-muted text-foreground text-sm border border-border rounded-lg truncate"
              title={reportsDir}
            />
            <button
              onClick={handleSelectDir}
              className="cyber-button px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 hover:bg-emerald-300 transition-opacity cursor-pointer text-sm whitespace-nowrap"
            >
              <i className="fa-solid fa-folder-open mr-1"></i>
              Alterar
            </button>
          </div>
          <div className="flex items-center gap-3">
            {reportsDir !== defaultDir && (
              <button
                onClick={handleResetDir}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer underline"
              >
                Restaurar padrão
              </button>
            )}
            {dirSaved && (
              <span className="text-xs text-success flex items-center gap-1">
                <i className="fa-solid fa-check"></i> Salvo
              </span>
            )}
          </div>
        </section>

        {/* Link para Perfil */}
        <section className="bg-card border border-border rounded-lg p-5">
          <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
            <i className="fa-solid fa-volume-high text-primary"></i>
            Som de Notificação
          </h2>
          <p className="text-sm text-muted-foreground mb-3">
            Escolha um som para os alertas de lembrete do relatório.
          </p>
          <div className="flex items-center gap-2 mb-3">
            <select
              value={selectedSound}
              onChange={(e) => handleSelectSound(e.target.value)}
              className="cyber-input flex-1 px-3 py-2 bg-muted text-foreground text-sm border border-border rounded-lg"
            >
              <option value="">Sem som</option>
              {sounds.map((s) => (
                <option key={s} value={s}>
                  {s.replace('.mp3', '').replace(/-/g, ' ')}
                </option>
              ))}
            </select>
            {selectedSound && (
              <button
                onClick={() => handlePlaySound(selectedSound)}
                className="cyber-button px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 hover:bg-emerald-300 transition-opacity cursor-pointer text-sm whitespace-nowrap"
                title="Ouvir som"
                aria-label="Ouvir som selecionado"
              >
                <i className="fa-solid fa-play" aria-hidden="true"></i>
              </button>
            )}
          </div>
          {soundSaved && (
            <span className="text-xs text-success flex items-center gap-1">
              <i className="fa-solid fa-check"></i> Salvo
            </span>
          )}
        </section>

        {/* Comportamento */}
        <section className="bg-card border border-border rounded-lg p-5">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <i className="fa-solid fa-sliders text-primary"></i>
            Comportamento
          </h2>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={autoLaunch}
              onChange={handleToggleAutoLaunch}
              className="accent-accent w-4 h-4"
            />
            <div>
              <span className="text-sm">Iniciar com o sistema</span>
              <p className="text-xs text-muted-foreground">
                O ShipIt! será iniciado automaticamente ao ligar o computador.
              </p>
            </div>
          </label>
        </section>

        {/* Notificações */}
        <section className="bg-card border border-border rounded-lg p-5">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <i className="fa-solid fa-bell text-primary"></i>
            Notificações
          </h2>

          {/* Toggle principal */}
          <label className="flex items-center gap-3 cursor-pointer mb-4">
            <input
              type="checkbox"
              checked={alertEnabled}
              onChange={(e) => setAlertEnabled(e.target.checked)}
              className="accent-accent w-4 h-4"
            />
            <div>
              <span className="text-sm">Habilitar alertas de lembrete</span>
              <p className="text-xs text-muted-foreground">
                Receba notificações próximas ao final do mês para lembrar de completar o relatório.
              </p>
            </div>
          </label>

          {alertEnabled && (
            <div className="space-y-4 pl-1">
              {/* Dias de antecedência */}
              <div>
                <label className="text-sm font-medium mb-2 block">Dias antes do fim do mês</label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_DAYS.map((day) => (
                    <button
                      key={day}
                      onClick={() => toggleAlertDay(day)}
                      className={`px-3 py-1.5 text-xs rounded-full border transition-colors cursor-pointer ${
                        alertDaysBefore.includes(day)
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-muted text-muted-foreground border-border hover:border-primary/50'
                      }`}
                    >
                      {day === 0 ? 'Último dia' : `${day} dia${day > 1 ? 's' : ''}`}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Selecione os dias de antecedência em que deseja receber alertas.
                </p>
              </div>

              {/* Horário */}
              <div>
                <label className="text-sm font-medium mb-1 block">Horário do alerta</label>
                <input
                  type="time"
                  value={alertTime}
                  onChange={(e) => setAlertTime(e.target.value)}
                  className="cyber-input px-3 py-2 text-foreground text-sm border border-border rounded-lg"
                />
              </div>

              {/* Mensagem */}
              <div>
                <label className="text-sm font-medium mb-1 block">Mensagem do alerta</label>
                <textarea
                  value={alertMessage}
                  onChange={(e) => setAlertMessage(e.target.value)}
                  rows={2}
                  className="cyber-input w-full px-3 py-2 text-foreground text-sm border border-border rounded-lg resize-none"
                />
              </div>

              {/* Som habilitado */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={alertSoundEnabled}
                  onChange={(e) => setAlertSoundEnabled(e.target.checked)}
                  className="accent-accent w-4 h-4"
                />
                <span className="text-sm">Tocar som ao alertar</span>
              </label>

              {/* Botão salvar */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSaveAlert}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity cursor-pointer text-sm flex items-center gap-2"
                >
                  <i className="fa-solid fa-floppy-disk"></i>
                  Salvar Notificações
                </button>
                {alertSaved && (
                  <span className="text-xs text-success flex items-center gap-1">
                    <i className="fa-solid fa-check"></i> Salvo
                  </span>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Link para Perfil */}
        <section className="bg-card border border-border rounded-lg p-5">
          <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
            <i className="fa-solid fa-user text-primary"></i>
            Perfil do Usuário
          </h2>
          <p className="text-sm text-muted-foreground mb-3">
            Gerencie seus dados pessoais, cargo, contrato e informações usadas no relatório.
          </p>
          <button
            onClick={() => navigate('/profile')}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity cursor-pointer text-sm flex items-center gap-2"
          >
            <i className="fa-solid fa-pen-to-square"></i>
            Editar Perfil
          </button>
        </section>

        {/* Atualizações */}
        <section className="bg-card border border-border rounded-lg p-5">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <i className="fa-solid fa-download text-primary"></i>
            Atualizações
          </h2>
          {!isElectron ? (
            <p className="text-sm text-muted-foreground italic">
              Disponível apenas na versão instalada.
            </p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleCheckForUpdate}
                  disabled={updateStatus.status === 'checking' || updateStatus.status === 'available'}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity cursor-pointer text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <i className={`fa-solid ${updateStatus.status === 'checking' ? 'fa-spinner fa-spin' : 'fa-rotate'}`}></i>
                  Verificar atualizações
                </button>
                {updateStatus.status === 'downloaded' && (
                  <button
                    onClick={handleInstallUpdate}
                    className="px-4 py-2 bg-accent text-accent-foreground font-semibold rounded-lg hover:opacity-90 transition-opacity cursor-pointer text-sm flex items-center gap-2"
                  >
                    <i className="fa-solid fa-arrow-rotate-right"></i>
                    Reiniciar e atualizar
                  </button>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {updateStatus.status === 'checking' && (
                  <span className="flex items-center gap-1"><i className="fa-solid fa-spinner fa-spin text-xs"></i> Verificando...</span>
                )}
                {updateStatus.status === 'not-available' && (
                  <span className="flex items-center gap-1 text-success"><i className="fa-solid fa-check text-xs"></i> Você está na versão mais recente.</span>
                )}
                {updateStatus.status === 'available' && (
                  <span className="flex items-center gap-1"><i className="fa-solid fa-cloud-arrow-down text-xs"></i> Versão {updateStatus.version} disponível — Baixando...</span>
                )}
                {updateStatus.status === 'downloaded' && (
                  <span className="flex items-center gap-1 text-accent"><i className="fa-solid fa-circle-check text-xs"></i> Versão {updateStatus.version} pronta — Reinicie para instalar.</span>
                )}
                {updateStatus.status === 'error' && (
                  <span className="flex items-center gap-1 text-destructive"><i className="fa-solid fa-circle-xmark text-xs"></i> Erro: {updateStatus.error}</span>
                )}
                {updateStatus.status === 'dev' && (
                  <span className="italic">Disponível apenas na versão instalada.</span>
                )}
              </p>
            </div>
          )}
        </section>

        {/* Sobre */}
        <section className="bg-card border border-border rounded-lg p-5">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <i className="fa-solid fa-circle-info text-primary"></i>
            Sobre o ShipIt!
          </h2>
          <div className="text-sm text-muted-foreground space-y-3">
            <p className="leading-relaxed">
              O <span className="text-foreground font-medium">ShipIt!</span> foi criado para facilitar a vida de quem precisa
              entregar relatórios mensais de atividades. Em vez de perder tempo formatando documentos,
              você registra suas atividades ao longo do mês, anexa evidências e, quando precisar,
              gera o relatório pronto com um clique. Simples assim.
            </p>
            {version && (
              <p>
                <span className="text-foreground font-medium">Versão</span> {version}
              </p>
            )}
            <div className="pt-2 border-t border-border/50">
              <p className="text-foreground font-medium">Mauro Rocha Tavares</p>
              <a
                href="mailto:mauro.rocha.t@gmail.com"
                className="text-primary hover:underline"
              >
                mauro.rocha.t@gmail.com
              </a>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
