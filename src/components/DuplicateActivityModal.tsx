import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import type { ActivityData, DuplicateActivityOptions } from '../vite-env'
import { localDb } from '../services/localDb'
import { getEvidenceTypeCounts } from '../utils/evidenceCounts'
import { htmlToPlainText } from '../utils/richText'

interface DuplicateActivityModalProps {
  activity: ActivityData
  open: boolean
  onClose: () => void
  onDuplicated: (copy: ActivityData) => void
}

const MONTH_REFERENCE_PATTERN = /^(\d{2})\/(\d{4})$/

/** Valida `MM/YYYY` com mês entre 01 e 12. Retorna a mensagem de erro ou `null`. */
export function validateMonthReference(value: string): string | null {
  const match = MONTH_REFERENCE_PATTERN.exec(value.trim())
  if (!match) return 'Informe o mês no formato MM/YYYY'
  const month = Number.parseInt(match[1], 10)
  if (month < 1 || month > 12) return 'Mês deve estar entre 01 e 12'
  return null
}

function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`
}

function describeEvidences(imageCount: number, textCount: number): string {
  if (imageCount + textCount === 0) return 'nenhuma'
  const parts: string[] = []
  if (imageCount > 0) parts.push(pluralize(imageCount, 'imagem', 'imagens'))
  if (textCount > 0) parts.push(pluralize(textCount, 'texto', 'textos'))
  return parts.join(', ')
}

function truncate(text: string, max = 60): string {
  const clean = text.trim()
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean
}

/**
 * Modal de opções para duplicar uma atividade (plano 43). Cria uma nova
 * atividade a partir da original via IPC (`db:duplicateActivity`) ou pelo
 * fallback `localDb` no browser, e entrega a cópia em `onDuplicated`.
 */
export function DuplicateActivityModal({
  activity,
  open,
  onClose,
  onDuplicated,
}: DuplicateActivityModalProps) {
  const [monthReference, setMonthReference] = useState(activity.month_reference)
  const [keepDates, setKeepDates] = useState(false)
  const [copyDeployments, setCopyDeployments] = useState(false)
  const [copyEvidences, setCopyEvidences] = useState(false)
  const [monthError, setMonthError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const monthInputRef = useRef<HTMLInputElement>(null)

  // Reinicia as opções a cada abertura (sem preferências globais).
  useEffect(() => {
    if (!open) return
    setMonthReference(activity.month_reference)
    setKeepDates(false)
    setCopyDeployments(false)
    setCopyEvidences(false)
    setMonthError(null)
    setBusy(false)
    monthInputRef.current?.focus()
    monthInputRef.current?.select()
  }, [open, activity.id, activity.month_reference])

  useEffect(() => {
    if (!open) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape' || busy) return
      e.preventDefault()
      onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, busy, onClose])

  if (!open) return null

  const { imageCount, textCount, total } = getEvidenceTypeCounts(activity.evidences)
  const evidenceSummary = describeEvidences(imageCount, textCount)
  const title = truncate(htmlToPlainText(activity.description) || 'atividade sem descrição')

  async function handleConfirm() {
    if (busy) return
    const error = validateMonthReference(monthReference)
    if (error) {
      setMonthError(error)
      monthInputRef.current?.focus()
      return
    }

    const options: DuplicateActivityOptions = {
      monthReference: monthReference.trim(),
      keepDates,
      copyDeployments,
      copyEvidences,
    }

    setBusy(true)
    try {
      const copy = window.electronAPI
        ? await window.electronAPI.duplicateActivity(activity.id, options)
        : localDb.duplicateActivity(activity.id, options)
      toast.success('Atividade duplicada')
      onDuplicated(copy)
    } catch (err) {
      console.error('Erro ao duplicar atividade:', err)
      toast.error('Erro ao duplicar atividade')
    } finally {
      setBusy(false)
    }
  }

  function handleMonthChange(value: string) {
    setMonthReference(value)
    if (monthError) setMonthError(null)
  }

  const checkboxClass = 'h-4 w-4 accent-primary rounded border-border cursor-pointer disabled:cursor-not-allowed'
  const optionLabelClass = 'flex items-center gap-3 text-sm text-foreground cursor-pointer select-none'

  return (
    <div
      id="duplicate-activity-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={() => !busy && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="duplicate-activity-title"
      aria-describedby="duplicate-activity-description"
    >
      <div
        className="bg-card border border-border rounded-lg p-6 shadow-xl max-w-md w-full mx-4 animate-modal-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-1 text-primary">
          <i className="fa-solid fa-clone text-xl" aria-hidden="true"></i>
          <h2 id="duplicate-activity-title" className="text-lg font-semibold text-foreground">
            Duplicar atividade
          </h2>
        </div>
        <p id="duplicate-activity-description" className="text-sm text-muted-foreground mb-5">
          Cria uma nova atividade a partir de “{title}”.
        </p>

        <div className="space-y-4">
          <div>
            <label htmlFor="duplicate-activity-month" className="block text-sm font-medium text-foreground mb-1">
              Mês de referência
            </label>
            <input
              ref={monthInputRef}
              id="duplicate-activity-month"
              type="text"
              inputMode="numeric"
              value={monthReference}
              onChange={(e) => handleMonthChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void handleConfirm()
                }
              }}
              placeholder="MM/YYYY"
              pattern="\d{2}/\d{4}"
              disabled={busy}
              aria-invalid={monthError ? 'true' : undefined}
              aria-describedby={monthError ? 'duplicate-activity-month-error' : undefined}
              className={monthError ? 'field field-error w-full' : 'field w-full'}
            />
            {monthError && (
              <p id="duplicate-activity-month-error" className="text-xs text-destructive mt-1" role="alert">
                {monthError}
              </p>
            )}
          </div>

          <label className={optionLabelClass} htmlFor="duplicate-activity-keep-dates">
            <input
              id="duplicate-activity-keep-dates"
              type="checkbox"
              checked={keepDates}
              onChange={(e) => setKeepDates(e.target.checked)}
              disabled={busy}
              className={checkboxClass}
            />
            <span>Manter período (início/fim)</span>
          </label>

          <label className={optionLabelClass} htmlFor="duplicate-activity-copy-deployments">
            <input
              id="duplicate-activity-copy-deployments"
              type="checkbox"
              checked={copyDeployments}
              onChange={(e) => setCopyDeployments(e.target.checked)}
              disabled={busy}
              className={checkboxClass}
            />
            <span>Copiar publicações por ambiente</span>
          </label>

          <label
            className={total === 0 ? `${optionLabelClass} opacity-60 cursor-not-allowed` : optionLabelClass}
            htmlFor="duplicate-activity-copy-evidences"
          >
            <input
              id="duplicate-activity-copy-evidences"
              type="checkbox"
              checked={copyEvidences}
              onChange={(e) => setCopyEvidences(e.target.checked)}
              disabled={busy || total === 0}
              className={checkboxClass}
            />
            <span>
              Copiar evidências{' '}
              <span className="text-muted-foreground" data-testid="duplicate-activity-evidence-counts">
                ({evidenceSummary})
              </span>
            </span>
          </label>
        </div>

        <div className="flex items-center gap-3 justify-end mt-6">
          <button
            type="button"
            id="duplicate-activity-cancel"
            onClick={onClose}
            disabled={busy}
            className="btn btn-outline"
          >
            Cancelar
          </button>
          <button
            type="button"
            id="duplicate-activity-confirm"
            onClick={() => void handleConfirm()}
            disabled={busy}
            className="btn btn-primary"
          >
            {busy ? (
              <>
                <i className="fa-solid fa-spinner fa-spin" aria-hidden="true"></i>
                Duplicando…
              </>
            ) : (
              <>
                <i className="fa-solid fa-clone" aria-hidden="true"></i>
                Duplicar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
