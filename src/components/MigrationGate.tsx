import { useEffect, useState } from 'react'
import type { StartupMigrationInfo, StartupMigrationResult } from '../vite-env'
import { copyTextToClipboard } from '../utils/clipboard'

interface MigrationGateProps {
  info: StartupMigrationInfo
  onFinished: () => void
}

type Phase = 'notice' | 'running' | 'done' | 'error'
type StepState = 'pending' | 'running' | 'done' | 'failed'

const STEPS = [
  { key: 'backup', label: 'Backup do banco de dados' },
  { key: 'migration', label: 'Conversão das atividades para o novo formato' },
  { key: 'sync', label: 'Atualização da estrutura do banco' },
] as const

function describeFromVersion(fromVersion: string | null): string {
  return fromVersion ? `versão ${fromVersion}` : 'versão anterior (1.13.x ou mais antiga)'
}

/**
 * Aviso bloqueante exibido ANTES da tela do app na primeira abertura após uma
 * atualização que migra o banco (plano 42). Fluxo: aviso (contagem regressiva)
 * → executando (backup → migração → sync) → concluído | erro.
 * Opaco e sem fechamento por Esc/clique fora: nada do app fica acessível.
 */
export function MigrationGate({ info, onFinished }: MigrationGateProps) {
  const [phase, setPhase] = useState<Phase>('notice')
  const [secondsLeft, setSecondsLeft] = useState(info.countdownSeconds)
  const [result, setResult] = useState<StartupMigrationResult | null>(null)
  const [stepStates, setStepStates] = useState<Record<string, StepState>>({
    backup: 'pending',
    migration: 'pending',
    sync: 'pending',
  })

  // Contagem regressiva: começa ao montar; limpa no unmount (StrictMode monta duas vezes em dev).
  useEffect(() => {
    if (phase !== 'notice' || secondsLeft <= 0) return
    const timer = setInterval(() => {
      setSecondsLeft((current) => (current > 0 ? current - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [phase, secondsLeft])

  const canProceed = secondsLeft <= 0
  const progressPercent = info.countdownSeconds > 0
    ? Math.max(0, Math.min(100, (secondsLeft / info.countdownSeconds) * 100))
    : 0

  async function runMigration() {
    setPhase('running')
    setResult(null)
    setStepStates({ backup: 'running', migration: 'pending', sync: 'pending' })

    let outcome: StartupMigrationResult
    try {
      outcome = await window.electronAPI!.runStartupMigration()
    } catch (error) {
      outcome = {
        success: false,
        stage: 'migration',
        error: error instanceof Error ? error.message : 'Erro inesperado ao migrar o banco de dados.',
      }
    }

    setResult(outcome)
    if (outcome.success) {
      setStepStates({ backup: 'done', migration: 'done', sync: 'done' })
      setPhase('done')
    } else if (outcome.stage === 'backup') {
      setStepStates({ backup: 'failed', migration: 'pending', sync: 'pending' })
      setPhase('error')
    } else {
      setStepStates({ backup: 'done', migration: 'failed', sync: 'pending' })
      setPhase('error')
    }
  }

  const backupPath = result?.success
    ? result.backupPath
    : (result && !result.success && result.backupPath) || info.plannedBackupPath

  return (
    <div
      id="migration-gate"
      className="fixed inset-0 z-100 overflow-y-auto bg-background text-foreground"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="migration-gate-title"
      aria-describedby="migration-gate-intro"
    >
      <div className="min-h-full flex items-start justify-center px-4 py-8">
        <div className="w-full max-w-3xl bg-card border-2 border-warning rounded-xl shadow-2xl animate-modal-in overflow-hidden">
          {/* Faixa de alerta */}
          <div className="flex items-center gap-4 px-6 py-4 bg-warning/15 border-b border-warning/40">
            <i
              className={`fa-solid fa-triangle-exclamation text-4xl ${phase === 'notice' ? 'animate-pulse' : ''} ${
                phase === 'done' ? 'text-success' : phase === 'error' ? 'text-destructive' : 'text-warning'
              }`}
              aria-hidden="true"
            ></i>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-warning">Atualização importante</p>
              <h1 id="migration-gate-title" className="text-xl font-bold">
                {phase === 'done' && 'Atualização concluída — ShipIt! ' + info.toVersion}
                {phase === 'error' && 'Não foi possível concluir a atualização'}
                {(phase === 'notice' || phase === 'running') && `ShipIt! ${info.toVersion} — leia antes de continuar`}
              </h1>
            </div>
          </div>

          <div className="px-6 py-5 space-y-5">
            {(phase === 'notice' || phase === 'running') && (
              <>
                <p id="migration-gate-intro" className="text-sm leading-relaxed">
                  Esta atualização traz <strong>mudanças importantes</strong> na forma como as atividades guardam
                  ambientes e releases (Desenvolvimento / Homologação / Produção). Antes de abrir o app,
                  <strong> será feito um backup do seu banco de dados</strong> e, em seguida, os dados serão convertidos.
                </p>

                <Section icon="fa-list-check" title="O que vai acontecer ao continuar">
                  <ol className="list-decimal list-inside space-y-1 text-sm">
                    <li>Backup completo do banco de dados — <strong>nada é apagado antes disso</strong>.</li>
                    <li>Conversão das atividades para o novo formato de publicações por ambiente.</li>
                    <li>
                      Releases antigas que <strong>não tinham ambiente marcado não serão mantidas</strong> — elas
                      continuam apenas no backup.
                    </li>
                  </ol>
                </Section>
              </>
            )}

            {phase === 'running' && (
              <Section icon="fa-gears" title="Executando">
                <StepList steps={stepStates} />
              </Section>
            )}

            {phase === 'done' && (
              <>
                <p className="text-sm leading-relaxed">
                  O backup foi criado e as atividades foram convertidas. Guarde o caminho abaixo caso precise
                  voltar para a versão anterior do app.
                </p>
                <StepList steps={stepStates} />
              </>
            )}

            {phase === 'error' && result && !result.success && (
              <div
                id="migration-gate-error"
                className="border-l-4 border-destructive bg-destructive/10 rounded-r-lg px-4 py-3 text-sm space-y-1"
                role="alert"
              >
                {result.stage === 'backup' ? (
                  <>
                    <p className="font-semibold text-destructive">O backup do banco de dados falhou.</p>
                    <p>
                      <strong>Nada foi alterado</strong> no seu banco de dados. Verifique o espaço em disco e as
                      permissões da pasta de dados e tente novamente.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-semibold text-destructive">A conversão dos dados falhou.</p>
                    <p>
                      O backup foi criado antes da falha. Use as instruções abaixo para voltar à versão anterior
                      e recuperar seus dados.
                    </p>
                  </>
                )}
                <p className="text-xs text-muted-foreground break-all">Detalhe técnico: {result.error}</p>
                {result.stage === 'backup' && <StepList steps={stepStates} />}
              </div>
            )}

            {/* Caminho do backup — sempre visível (planejado antes, real depois) */}
            {!(phase === 'error' && result && !result.success && result.stage === 'backup') && (
              <Section icon="fa-database" title={phase === 'done' ? 'Backup salvo em' : 'Onde ficará o backup'}>
                <code
                  id="migration-gate-backup-path"
                  className="block text-xs bg-muted/60 border border-border rounded px-3 py-2 break-all select-all"
                >
                  {backupPath}
                </code>
                <div className="flex flex-wrap gap-2 mt-2">
                  <button
                    type="button"
                    id="migration-gate-copy-path"
                    className="btn btn-outline btn-sm"
                    onClick={() => { void copyTextToClipboard(backupPath, 'Caminho do backup') }}
                  >
                    <i className="fa-solid fa-copy" aria-hidden="true"></i>
                    Copiar caminho
                  </button>
                  {phase === 'done' && (
                    <button
                      type="button"
                      id="migration-gate-open-folder"
                      className="btn btn-outline btn-sm"
                      onClick={() => { void window.electronAPI?.openFileInFolder(backupPath) }}
                    >
                      <i className="fa-solid fa-folder-open" aria-hidden="true"></i>
                      Abrir pasta
                    </button>
                  )}
                </div>
              </Section>
            )}

            <Section icon="fa-rotate-left" title={`Se precisar voltar para a ${describeFromVersion(info.fromVersion)}`}>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>Feche o ShipIt!.</li>
                <li>
                  Baixe e instale a versão anterior na página de versões do projeto:{' '}
                  <button
                    type="button"
                    id="migration-gate-open-releases"
                    className="btn-link text-sm"
                    onClick={() => { void window.electronAPI?.openReleasesPage() }}
                  >
                    {info.releasesUrl}
                  </button>
                </li>
                <li>
                  Na pasta de dados do app (<code className="text-xs break-all">{info.userDataDir}</code>), renomeie
                  o arquivo <code className="text-xs">shipit.db</code> para <code className="text-xs">shipit-novo.db</code>{' '}
                  e copie o backup acima para lá com o nome <code className="text-xs">shipit.db</code>.
                </li>
                <li>
                  Abra o ShipIt! — os dados voltam ao estado anterior à atualização. Atividades criadas depois da
                  atualização não estarão no backup.
                </li>
              </ol>
            </Section>
          </div>

          {/* Rodapé com ações */}
          <div className="px-6 py-4 border-t border-border bg-muted/30">
            {phase === 'notice' && (
              <div className="space-y-3">
                <div
                  className="h-2 w-full rounded-full bg-muted overflow-hidden"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={info.countdownSeconds}
                  aria-valuenow={secondsLeft}
                  aria-label="Tempo restante para poder continuar"
                >
                  <div
                    className="h-full bg-warning transition-[width] duration-1000 ease-linear"
                    style={{ width: `${progressPercent}%` }}
                  ></div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span id="migration-gate-countdown" className="text-xs text-muted-foreground" aria-live="polite">
                    {canProceed
                      ? 'Você já pode continuar.'
                      : `Leia com atenção — o botão libera em ${secondsLeft} s.`}
                  </span>
                  <button
                    type="button"
                    id="migration-gate-confirm"
                    className="btn btn-accent btn-lg shadow-md"
                    disabled={!canProceed}
                    onClick={() => { void runMigration() }}
                  >
                    <i className="fa-solid fa-shield-halved" aria-hidden="true"></i>
                    {canProceed
                      ? 'Entendi, fazer backup e atualizar'
                      : `Entendi, fazer backup e atualizar (${secondsLeft} s)`}
                  </button>
                </div>
              </div>
            )}

            {phase === 'running' && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <i className="fa-solid fa-spinner fa-spin" aria-hidden="true"></i>
                Não feche o app até a conclusão.
              </div>
            )}

            {phase === 'done' && (
              <div className="flex justify-end">
                <button
                  type="button"
                  id="migration-gate-open-app"
                  className="btn btn-accent btn-lg shadow-md"
                  onClick={onFinished}
                >
                  <i className="fa-solid fa-rocket" aria-hidden="true"></i>
                  Abrir o ShipIt!
                </button>
              </div>
            )}

            {phase === 'error' && result && !result.success && (
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  id="migration-gate-quit"
                  className="btn btn-outline-destructive"
                  onClick={() => { void window.electronAPI?.quitApp() }}
                >
                  <i className="fa-solid fa-power-off" aria-hidden="true"></i>
                  Fechar o app
                </button>
                {result.stage === 'backup' && (
                  <button
                    type="button"
                    id="migration-gate-retry"
                    className="btn btn-accent"
                    onClick={() => { void runMigration() }}
                  >
                    <i className="fa-solid fa-rotate-right" aria-hidden="true"></i>
                    Tentar novamente
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Section({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <section className="border-l-4 border-warning/70 pl-4">
      <h2 className="text-sm font-semibold mb-2 flex items-center gap-2">
        <i className={`fa-solid ${icon} text-warning`} aria-hidden="true"></i>
        {title}
      </h2>
      {children}
    </section>
  )
}

function StepList({ steps }: { steps: Record<string, StepState> }) {
  const iconFor: Record<StepState, string> = {
    pending: 'fa-regular fa-circle text-muted-foreground',
    running: 'fa-solid fa-spinner fa-spin text-warning',
    done: 'fa-solid fa-circle-check text-success',
    failed: 'fa-solid fa-circle-xmark text-destructive',
  }
  return (
    <ul id="migration-gate-steps" className="space-y-1 text-sm">
      {STEPS.map((step) => (
        <li key={step.key} className="flex items-center gap-2" data-step={step.key} data-state={steps[step.key]}>
          <i className={iconFor[steps[step.key]]} aria-hidden="true"></i>
          {step.label}
        </li>
      ))}
    </ul>
  )
}
