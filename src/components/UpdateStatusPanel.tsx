import type { UpdateStatusData } from '../vite-env'

interface UpdateStatusPanelProps {
  idPrefix: string
  isElectron: boolean
  updateStatus: UpdateStatusData
  onCheck: () => void
  onDownload: () => void
  onInstall: () => void
}

function formatProgress(progress?: number): number {
  if (typeof progress !== 'number' || Number.isNaN(progress)) {
    return 0
  }

  return Math.max(0, Math.min(100, Math.round(progress)))
}

export function UpdateStatusPanel({
  idPrefix,
  isElectron,
  updateStatus,
  onCheck,
  onDownload,
  onInstall,
}: UpdateStatusPanelProps) {
  if (!isElectron) {
    return (
      <p id={`${idPrefix}-status`} className="text-sm text-muted-foreground italic">
        Disponível apenas na versão instalada.
      </p>
    )
  }

  const isChecking = updateStatus.status === 'checking'
  const isDownloading = updateStatus.status === 'downloading'
  const showDownloadAction = updateStatus.status === 'available' || isDownloading
  const progressValue = formatProgress(updateStatus.progress)

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        O ShipIt! verifica novas versões ao iniciar. Baixar e instalar continuam manuais.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <button
          id={`${idPrefix}-btn-check`}
          onClick={onCheck}
          disabled={isChecking || isDownloading}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity cursor-pointer text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <i className={`fa-solid ${isChecking ? 'fa-spinner fa-spin' : 'fa-rotate'}`}></i>
          Verificar atualizações
        </button>

        {showDownloadAction && (
          <button
            id={`${idPrefix}-btn-download`}
            onClick={onDownload}
            disabled={isDownloading}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:opacity-90 transition-opacity cursor-pointer text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <i className={`fa-solid ${isDownloading ? 'fa-spinner fa-spin' : 'fa-cloud-arrow-down'}`}></i>
            {isDownloading ? 'Baixando atualização' : 'Baixar atualização'}
          </button>
        )}

        {updateStatus.status === 'downloaded' && (
          <button
            id={`${idPrefix}-btn-install`}
            onClick={onInstall}
            className="px-4 py-2 bg-accent text-accent-foreground font-semibold rounded-lg hover:opacity-90 transition-opacity cursor-pointer text-sm flex items-center gap-2"
          >
            <i className="fa-solid fa-arrow-rotate-right"></i>
            Instalar agora
          </button>
        )}
      </div>

      {isDownloading && (
        <div className="space-y-2">
          <div className="h-2 rounded-full bg-muted overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progressValue}>
            <div
              className="h-full bg-primary transition-[width] duration-300 ease-out"
              style={{ width: `${progressValue}%` }}
            ></div>
          </div>
          <p className="text-xs text-muted-foreground">Download em andamento: {progressValue}%</p>
        </div>
      )}

      <p id={`${idPrefix}-status`} className="text-sm text-muted-foreground min-h-6">
        {updateStatus.status === 'checking' && (
          <span className="flex items-center gap-1"><i className="fa-solid fa-spinner fa-spin text-xs"></i> Verificando novas versões...</span>
        )}
        {updateStatus.status === 'not-available' && (
          <span className="flex items-center gap-1 text-success"><i className="fa-solid fa-check text-xs"></i> Você está na versão mais recente.</span>
        )}
        {updateStatus.status === 'available' && (
          <span className="flex items-center gap-1"><i className="fa-solid fa-circle-arrow-down text-xs"></i> Versão {updateStatus.version} pronta para download.</span>
        )}
        {updateStatus.status === 'downloading' && (
          <span className="flex items-center gap-1"><i className="fa-solid fa-spinner fa-spin text-xs"></i> Baixando a versão {updateStatus.version}...</span>
        )}
        {updateStatus.status === 'downloaded' && (
          <span className="flex items-center gap-1 text-accent"><i className="fa-solid fa-circle-check text-xs"></i> Versão {updateStatus.version} baixada. Clique em Instalar agora para concluir.</span>
        )}
        {updateStatus.status === 'error' && (
          <span className="flex items-center gap-1 text-destructive"><i className="fa-solid fa-circle-xmark text-xs"></i> Erro: {updateStatus.error}</span>
        )}
        {updateStatus.status === 'dev' && (
          <span className="italic">Disponível apenas na versão instalada.</span>
        )}
      </p>
    </div>
  )
}