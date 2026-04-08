import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'
import type { AppSettings } from '../vite-env'

export function SettingsPage() {
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()
  const [reportsDir, setReportsDir] = useState('')
  const [defaultDir, setDefaultDir] = useState('')
  const [version, setVersion] = useState('')
  const [dirSaved, setDirSaved] = useState(false)

  useEffect(() => {
    async function load() {
      if (!window.electronAPI) return
      const [settings, defDir, ver] = await Promise.all([
        window.electronAPI.getSettings(),
        window.electronAPI.getDefaultReportsDir(),
        window.electronAPI.getVersion(),
      ])
      setDefaultDir(defDir)
      setReportsDir((settings as AppSettings).reportsDirectory || defDir)
      setVersion(ver)
    }
    load()
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
        <h1 className="text-2xl font-bold">Configurações</h1>
      </div>

      <div className="space-y-6">
        {/* Aparência */}
        <section className="bg-card border border-border rounded-lg p-5">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <i className="fa-solid fa-palette text-primary"></i>
            Aparência
          </h2>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="theme"
                value="dark"
                checked={theme === 'dark'}
                onChange={() => setTheme('dark')}
                className="accent-accent"
              />
              <i className="fa-solid fa-moon text-muted-foreground"></i>
              <span className="text-sm">Modo Escuro</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="theme"
                value="light"
                checked={theme === 'light'}
                onChange={() => setTheme('light')}
                className="accent-accent"
              />
              <i className="fa-solid fa-sun text-muted-foreground"></i>
              <span className="text-sm">Modo Claro</span>
            </label>
          </div>
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
              className="flex-1 px-3 py-2 bg-muted text-foreground text-sm border border-border rounded-lg truncate"
              title={reportsDir}
            />
            <button
              onClick={handleSelectDir}
              className="px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity cursor-pointer text-sm whitespace-nowrap"
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

        {/* Sobre */}
        <section className="bg-card border border-border rounded-lg p-5">
          <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
            <i className="fa-solid fa-circle-info text-primary"></i>
            Sobre
          </h2>
          <div className="text-sm text-muted-foreground space-y-1">
            <p><span className="text-foreground font-medium">ShipIt!</span> — Relatório Mensal de Atividades</p>
            {version && <p>Versão {version}</p>}
            <p>Electron + React + TypeScript</p>
          </div>
        </section>
      </div>
    </div>
  )
}
