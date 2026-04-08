import { useNavigate } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'

export function SettingsPage() {
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()

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
      </div>
    </div>
  )
}
