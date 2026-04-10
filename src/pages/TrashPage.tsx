import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import type { EvidenceData } from '../vite-env'
import { SkeletonEvidenceGrid } from '../components/Skeleton'

function formatDate(d: string | null): string {
  if (!d) return '—'
  const date = new Date(d)
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function getDaysUntilPermanentDelete(deletedAt: string | null): number {
  if (!deletedAt) return 90
  const deleted = new Date(deletedAt)
  const expiresAt = new Date(deleted)
  expiresAt.setMonth(expiresAt.getMonth() + 3) // 3 months retention
  const now = new Date()
  const diff = expiresAt.getTime() - now.getTime()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

export function TrashPage() {
  const navigate = useNavigate()
  const [evidences, setEvidences] = useState<EvidenceData[]>([])
  const [loading, setLoading] = useState(true)
  const [restoring, setRestoring] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [emptyingTrash, setEmptyingTrash] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [confirmEmpty, setConfirmEmpty] = useState(false)

  const loadEvidences = useCallback(async () => {
    setLoading(true)
    try {
      if (window.electronAPI) {
        const data = await window.electronAPI.getDeletedEvidences()
        setEvidences(data)
      } else {
        // Browser fallback - no trash support
        setEvidences([])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadEvidences()
  }, [loadEvidences])

  async function handleRestore(id: string) {
    if (!window.electronAPI) return
    setRestoring(id)
    try {
      const success = await window.electronAPI.restoreEvidence(id)
      if (success) {
        setEvidences(prev => prev.filter(e => e.id !== id))
        window.dispatchEvent(new Event('shipit:trash-changed'))
        toast.success('Evidência restaurada com sucesso!')
      }
    } catch {
      toast.error('Erro ao restaurar evidência')
    } finally {
      setRestoring(null)
    }
  }

  async function handlePermanentDelete(id: string) {
    if (!window.electronAPI) return
    setDeleting(id)
    setConfirmDelete(null)
    try {
      const success = await window.electronAPI.permanentlyDeleteEvidence(id)
      if (success) {
        setEvidences(prev => prev.filter(e => e.id !== id))
        window.dispatchEvent(new Event('shipit:trash-changed'))
        toast.success('Evidência excluída permanentemente')
      }
    } catch {
      toast.error('Erro ao excluir evidência')
    } finally {
      setDeleting(null)
    }
  }

  async function handleEmptyTrash() {
    if (!window.electronAPI) return
    setEmptyingTrash(true)
    setConfirmEmpty(false)
    try {
      for (const ev of evidences) {
        await window.electronAPI.permanentlyDeleteEvidence(ev.id)
      }
      setEvidences([])
      window.dispatchEvent(new Event('shipit:trash-changed'))
      toast.success('Lixeira esvaziada com sucesso!')
    } catch {
      toast.error('Erro ao esvaziar lixeira')
    } finally {
      setEmptyingTrash(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer rounded focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            title="Voltar"
            aria-label="Voltar"
          >
            <i className="fa-solid fa-arrow-left text-lg" aria-hidden="true"></i>
          </button>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <i className="fa-solid fa-trash-can text-muted-foreground"></i>
            Lixeira
          </h1>
          {evidences.length > 0 && (
            <span className="text-sm text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {evidences.length} {evidences.length === 1 ? 'item' : 'itens'}
            </span>
          )}
        </div>

        {evidences.length > 0 && (
          <button
            onClick={() => setConfirmEmpty(true)}
            disabled={emptyingTrash}
            className="px-3 py-1.5 text-sm bg-destructive text-destructive-foreground rounded hover:bg-destructive/90 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {emptyingTrash ? (
              <>
                <i className="fa-solid fa-spinner fa-spin"></i>
                Esvaziando...
              </>
            ) : (
              <>
                <i className="fa-solid fa-trash"></i>
                Esvaziar Lixeira
              </>
            )}
          </button>
        )}
      </div>

      {/* Info banner */}
      <div className="bg-muted/50 border border-border rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <i className="fa-solid fa-circle-info text-primary mt-0.5"></i>
          <div className="text-sm text-muted-foreground">
            <p className="mb-1">
              <strong className="text-foreground">Como funciona a lixeira:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>Evidências excluídas ficam na lixeira por <strong>3 meses</strong></li>
              <li>Você pode <strong>restaurar</strong> uma evidência a qualquer momento</li>
              <li>Após 3 meses, as evidências são <strong>excluídas permanentemente</strong> de forma automática</li>
              <li>Você também pode excluir permanentemente a qualquer momento</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Loading skeleton */}
      {loading && <SkeletonEvidenceGrid count={6} />}

      {/* Empty state */}
      {!loading && evidences.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <i className="fa-regular fa-trash-can text-4xl mb-3 opacity-50"></i>
          <p className="text-lg mb-2">A lixeira está vazia</p>
          <p className="text-sm">Evidências excluídas aparecerão aqui</p>
        </div>
      )}

      {/* Evidences grid */}
      {!loading && evidences.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {evidences.map((ev) => {
            const daysLeft = getDaysUntilPermanentDelete(ev.deleted_at)
            const isExpiringSoon = daysLeft <= 7

            return (
              <div
                key={ev.id}
                className="bg-card border border-border rounded-lg overflow-hidden group"
              >
                {/* Thumbnail */}
                <div className="relative aspect-video bg-muted">
                  <img
                    src={`shipit-evidence://host?path=${encodeURIComponent(ev.file_path)}`}
                    alt={ev.caption || 'Evidência'}
                    className="w-full h-full object-cover opacity-60"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23374151" width="100" height="100"/><text x="50" y="55" text-anchor="middle" fill="%239CA3AF" font-size="12">Sem preview</text></svg>'
                    }}
                  />
                  {/* Overlay with days left */}
                  <div className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-medium ${
                    isExpiringSoon
                      ? 'bg-destructive text-destructive-foreground'
                      : 'bg-background/80 text-muted-foreground'
                  }`}>
                    <i className="fa-regular fa-clock mr-1"></i>
                    {daysLeft === 0 ? 'Expira hoje' : `${daysLeft} dias restantes`}
                  </div>
                </div>

                {/* Content */}
                <div className="p-3">
                  <p className="text-sm text-foreground line-clamp-2 mb-2">
                    {ev.caption || <span className="text-muted-foreground italic">Sem legenda</span>}
                  </p>
                  <p className="text-xs text-muted-foreground mb-3">
                    <i className="fa-regular fa-calendar mr-1"></i>
                    Excluído em {formatDate(ev.deleted_at)}
                  </p>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleRestore(ev.id)}
                      disabled={restoring === ev.id || deleting === ev.id}
                      className="flex-1 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                    >
                      {restoring === ev.id ? (
                        <i className="fa-solid fa-spinner fa-spin"></i>
                      ) : (
                        <>
                          <i className="fa-solid fa-rotate-left"></i>
                          Restaurar
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setConfirmDelete(ev.id)}
                      disabled={restoring === ev.id || deleting === ev.id}
                      className="px-3 py-1.5 text-sm border border-destructive text-destructive rounded hover:bg-destructive hover:text-destructive-foreground transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Excluir permanentemente"
                      aria-label="Excluir permanentemente"
                    >
                      {deleting === ev.id ? (
                        <i className="fa-solid fa-spinner fa-spin"></i>
                      ) : (
                        <i className="fa-solid fa-trash"></i>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Confirm permanent delete modal */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setConfirmDelete(null)}
          role="alertdialog" aria-modal="true" aria-labelledby="trash-delete-title"
        >
          <div
            className="bg-card border border-border rounded-lg p-6 shadow-xl max-w-sm w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4 text-destructive">
              <i className="fa-solid fa-triangle-exclamation text-xl" aria-hidden="true"></i>
              <h2 id="trash-delete-title" className="text-lg font-semibold">Excluir permanentemente?</h2>
            </div>
            <p className="text-muted-foreground mb-6">
              Esta ação não pode ser desfeita. O arquivo será excluído permanentemente do sistema.
            </p>
            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 text-sm rounded hover:bg-muted transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => handlePermanentDelete(confirmDelete)}
                className="px-4 py-2 text-sm bg-destructive text-destructive-foreground rounded hover:bg-destructive/90 transition-colors cursor-pointer"
              >
                Excluir permanentemente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm empty trash modal */}
      {confirmEmpty && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setConfirmEmpty(false)}
          role="alertdialog" aria-modal="true" aria-labelledby="trash-empty-title"
        >
          <div
            className="bg-card border border-border rounded-lg p-6 shadow-xl max-w-sm w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4 text-destructive">
              <i className="fa-solid fa-triangle-exclamation text-xl" aria-hidden="true"></i>
              <h2 id="trash-empty-title" className="text-lg font-semibold">Esvaziar lixeira?</h2>
            </div>
            <p className="text-muted-foreground mb-6">
              Esta ação excluirá permanentemente <strong>{evidences.length}</strong> {evidences.length === 1 ? 'evidência' : 'evidências'}.
              Esta ação não pode ser desfeita.
            </p>
            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => setConfirmEmpty(false)}
                className="px-4 py-2 text-sm rounded hover:bg-muted transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleEmptyTrash}
                className="px-4 py-2 text-sm bg-destructive text-destructive-foreground rounded hover:bg-destructive/90 transition-colors cursor-pointer"
              >
                Esvaziar lixeira
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
