import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { UpdateStatusPanel } from '../components/UpdateStatusPanel'
import { useUpdateState } from '../contexts/UpdateStateContext'
import { ThemeSelector } from '../components/ThemeSelector'
import { Select } from '../components/Select'
import { TimePicker } from '../components/TimePicker'
import type { AppSettings } from '../vite-env'
import { registerSaveContextHandler, type SaveContextResult } from '../menu/saveContextRegistry'

export function SettingsPage() {
  const location = useLocation()
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
  const [savedAlertFingerprint, setSavedAlertFingerprint] = useState('')
  const [isUpdateSectionVisible, setIsUpdateSectionVisible] = useState(false)
  const updateSectionRef = useRef<HTMLElement | null>(null)
  const {
    acknowledgeUpdateAttention,
    checkForUpdate,
    downloadUpdate,
    installUpdate,
    isElectron,
    updateStatus,
  } = useUpdateState()
  const isUpdateFocusRequested = new URLSearchParams(location.search).get('focus') === 'update'

  const buildAlertFingerprint = useCallback((input: {
    alertEnabled: boolean
    alertDaysBefore: number[]
    alertTime: string
    alertMessage: string
    alertSoundEnabled: boolean
  }): string => {
    return JSON.stringify({
      alertEnabled: input.alertEnabled,
      alertDaysBefore: [...input.alertDaysBefore].sort((a, b) => b - a),
      alertTime: input.alertTime,
      alertMessage: input.alertMessage.trim(),
      alertSoundEnabled: input.alertSoundEnabled,
    })
  }, [])

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

      let nextAlertEnabled = true
      let nextAlertDaysBefore = [5, 3, 2, 1, 0]
      let nextAlertTime = '09:00'
      let nextAlertMessage = 'Lembrete: Preencha os campos obrigatórios para gerar o relatório mensal!'
      let nextAlertSoundEnabled = true

      if (alertData) {
        nextAlertEnabled = alertData.alert_enabled
        try {
          nextAlertDaysBefore = JSON.parse(alertData.alert_days_before)
        } catch {
          // Keep defaults when persisted format is invalid.
        }
        nextAlertTime = alertData.alert_time || '09:00'
        nextAlertMessage = alertData.alert_message || ''
        nextAlertSoundEnabled = alertData.alert_sound_enabled
      }

      setAlertEnabled(nextAlertEnabled)
      setAlertDaysBefore(nextAlertDaysBefore)
      setAlertTime(nextAlertTime)
      setAlertMessage(nextAlertMessage)
      setAlertSoundEnabled(nextAlertSoundEnabled)
      setSavedAlertFingerprint(buildAlertFingerprint({
        alertEnabled: nextAlertEnabled,
        alertDaysBefore: nextAlertDaysBefore,
        alertTime: nextAlertTime,
        alertMessage: nextAlertMessage,
        alertSoundEnabled: nextAlertSoundEnabled,
      }))
    }
    load()

    // Listen for sound data from main process
    let cleanupSound: (() => void) | undefined
    if (window.electronAPI) {
      cleanupSound = window.electronAPI.onPlaySoundData((dataUrl) => {
        if (audioRef.current) {
          audioRef.current.pause()
        }
        const audio = new Audio(dataUrl)
        audioRef.current = audio
        audio.play().catch(() => {})
      })
    }

    return () => {
      cleanupSound?.()
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [buildAlertFingerprint])

  useEffect(() => {
    const section = updateSectionRef.current
    if (!section) return

    if (typeof IntersectionObserver === 'undefined') {
      setIsUpdateSectionVisible(true)
      return
    }

    const observer = new IntersectionObserver(([entry]) => {
      setIsUpdateSectionVisible(entry.isIntersecting && entry.intersectionRatio >= 0.35)
    }, { threshold: [0.35, 0.7] })

    observer.observe(section)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!isUpdateFocusRequested) return

    const frame = window.requestAnimationFrame(() => {
      updateSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })

    return () => window.cancelAnimationFrame(frame)
  }, [isUpdateFocusRequested])

  useEffect(() => {
    if (!isUpdateFocusRequested || !isUpdateSectionVisible || !updateStatus.attentionVisible || !updateStatus.version) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      void acknowledgeUpdateAttention(updateStatus.version)
    }, 10_000)

    return () => window.clearTimeout(timeoutId)
  }, [acknowledgeUpdateAttention, isUpdateFocusRequested, isUpdateSectionVisible, updateStatus.attentionVisible, updateStatus.version])

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

  const persistAlertSettings = useCallback(async (): Promise<boolean> => {
    if (!window.electronAPI) return false

    await window.electronAPI.saveAlert({
      alert_enabled: alertEnabled,
      alert_days_before: JSON.stringify(alertDaysBefore),
      alert_time: alertTime,
      alert_message: alertMessage,
      alert_sound_enabled: alertSoundEnabled,
    })

    setSavedAlertFingerprint(buildAlertFingerprint({
      alertEnabled,
      alertDaysBefore,
      alertTime,
      alertMessage,
      alertSoundEnabled,
    }))

    setAlertSaved(true)
    setTimeout(() => setAlertSaved(false), 2000)
    return true
  }, [
    alertEnabled,
    alertDaysBefore,
    alertTime,
    alertMessage,
    alertSoundEnabled,
    buildAlertFingerprint,
  ])

  async function handleSaveAlert() {
    await persistAlertSettings()
  }

  const handleContextSave = useCallback(async (): Promise<SaveContextResult> => {
    if (!window.electronAPI) {
      return {
        status: 'unavailable',
        message: 'Este comando está disponível apenas no aplicativo desktop.',
      }
    }

    const currentFingerprint = buildAlertFingerprint({
      alertEnabled,
      alertDaysBefore,
      alertTime,
      alertMessage,
      alertSoundEnabled,
    })

    if (currentFingerprint === savedAlertFingerprint) {
      return {
        status: 'no-changes',
        message: 'Nenhuma alteração pendente nas notificações.',
      }
    }

    try {
      await persistAlertSettings()
      return {
        status: 'saved',
        message: 'Configurações de notificação salvas.',
      }
    } catch {
      return {
        status: 'error',
        message: 'Erro ao salvar as notificações.',
      }
    }
  }, [
    alertEnabled,
    alertDaysBefore,
    alertTime,
    alertMessage,
    alertSoundEnabled,
    savedAlertFingerprint,
    buildAlertFingerprint,
    persistAlertSettings,
  ])

  useEffect(() => {
    return registerSaveContextHandler(handleContextSave)
  }, [handleContextSave])

  return (
    <div id="settings" className="max-w-4xl mx-auto">
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
        <section id="settings-theme-section" className="bg-card border border-border rounded-lg p-5">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <i className="fa-solid fa-palette text-primary"></i>
            Aparência
          </h2>
          <ThemeSelector />
        </section>

        {/* Diretório de Relatórios */}
        <section id="settings-reports-section" className="bg-card border border-border rounded-lg p-5">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <i className="fa-solid fa-folder-open text-primary"></i>
            Diretório de Relatórios
          </h2>
          <p className="text-sm text-muted-foreground mb-3">
            Pasta onde os relatórios DOCX gerados serão salvos.
          </p>
          <div className="flex items-center gap-2 mb-3">
            <div className="cyber-input-frame cyber-frame-muted flex-1">
              <input
                type="text"
                readOnly
                value={reportsDir}
                className="cyber-input flex-1 px-3 py-2 bg-muted text-foreground text-sm w-full border border-border rounded-lg truncate"
                title={reportsDir}
              />
            </div>
            <button
              id="settings-reports-btn-select"
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
                id="settings-reports-btn-reset"
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
        <section id="settings-sounds-section" className="bg-card border border-border rounded-lg p-5">
          <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
            <i className="fa-solid fa-volume-high text-primary"></i>
            Som de Notificação
          </h2>
          <p className="text-sm text-muted-foreground mb-3">
            Escolha um som para os alertas de lembrete do relatório.
          </p>
          <div className="flex items-center gap-2 mb-3">
            <div className="flex-1">
              <Select
                value={selectedSound}
                onChange={(v) => handleSelectSound(v)}
                options={[
                  { value: '', label: 'Sem som' },
                  ...sounds.map((s) => ({ value: s, label: s.replace('.mp3', '').replace(/-/g, ' ') })),
                ]}
                placeholder="Sem som"
                size="sm"
              />
            </div>
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
        <section id="settings-autolaunch-section" className="bg-card border border-border rounded-lg p-5">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <i className="fa-solid fa-sliders text-primary"></i>
            Comportamento
          </h2>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              id="settings-autolaunch-toggle"
              type="checkbox"
              checked={autoLaunch}
              onChange={handleToggleAutoLaunch}
              className="cyberpunk-input accent-accent w-4 h-4"
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
        <section id="settings-alerts-section" className="bg-card border border-border rounded-lg p-5">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <i className="fa-solid fa-bell text-primary"></i>
            Notificações
          </h2>

          {/* Toggle principal */}
          <label className="flex items-center gap-3 cursor-pointer mb-4">
            <input
              id="settings-alerts-toggle"
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
              <div id="settings-alerts-days">
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
                <TimePicker
                  id="settings-alerts-time"
                  value={alertTime}
                  onChange={(v) => setAlertTime(v)}
                  className="w-32"
                />
              </div>

              {/* Mensagem */}
              <div>
                <label className="text-sm font-medium mb-1 block">Mensagem do alerta</label>
                <div className="cyber-input-frame">
                  <textarea
                    value={alertMessage}
                    onChange={(e) => setAlertMessage(e.target.value)}
                    rows={2}
                    className="cyber-input w-full px-3 py-2 text-foreground text-sm border border-border rounded-lg resize-none"
                  />
                </div>
              </div>

              {/* Som habilitado */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  id="settings-alerts-sound-toggle"
                  type="checkbox"
                  checked={alertSoundEnabled}
                  onChange={(e) => setAlertSoundEnabled(e.target.checked)}
                  className="cyber-input accent-accent w-4 h-4"
                />
                <span className="text-sm">Tocar som ao alertar</span>
              </label>

              {/* Botão salvar */}
              <div className="flex items-center gap-3">
                <button
                  id="settings-alerts-btn-save"
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

        {/* Atualizações */}
        <section ref={updateSectionRef} id="settings-update-section" className="bg-card border border-border rounded-lg p-5 scroll-mt-6">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <i className="fa-solid fa-download text-primary"></i>
              Atualizações
            </h2>
            {updateStatus.attentionVisible && (
              <span id="settings-update-attention-badge" className="shipit-attention-badge relative inline-flex h-2.5 w-2.5 rounded-full bg-accent ring-2 ring-card" aria-hidden="true"></span>
            )}
          </div>

          {isUpdateFocusRequested && updateStatus.attentionVisible && updateStatus.version && (
            <p className="text-xs text-muted-foreground mb-3">
              Esta versão será marcada como visualizada após 10 segundos com esta seção em foco.
            </p>
          )}

          <UpdateStatusPanel
            idPrefix="settings-update"
            isElectron={isElectron}
            updateStatus={updateStatus}
            onCheck={() => { void checkForUpdate() }}
            onDownload={() => { void downloadUpdate() }}
            onInstall={() => { void installUpdate() }}
          />
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
              <p id="settings-version">
                <span className="text-foreground font-medium">Versão</span> {version}
              </p>
            )}
            <div className="pt-2 border-t border-border/50">
              <p className="text-foreground font-medium">Mauro Rocha Tavares</p>
              <a
                href="mailto:mauro.rocha.t@gmail.com"
                target="_blank"
                rel="noopener noreferrer"
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
