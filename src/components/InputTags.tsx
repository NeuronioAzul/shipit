import { useMemo, useState } from 'react'

interface InputTagsProps {
  id?: string
  name?: string
  value: string[]
  onChange: (next: string[]) => void
  placeholder?: string
  disabled?: boolean
  hasError?: boolean
  validateTag?: (tag: string) => string | null
  normalizeTag?: (tag: string) => string
}

function splitCandidateTags(raw: string): string[] {
  return raw
    .split(/[\n,;]+/)
    .map((part) => part.trim())
    .filter(Boolean)
}

export function InputTags({
  id,
  name,
  value,
  onChange,
  placeholder = 'Digite e use vírgula para adicionar',
  disabled = false,
  hasError = false,
  validateTag,
  normalizeTag,
}: InputTagsProps) {
  const [draft, setDraft] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)

  const valueSet = useMemo(() => new Set(value), [value])

  function removeTag(tagToRemove: string) {
    onChange(value.filter((tag) => tag !== tagToRemove))
    setLocalError(null)
  }

  function commitRaw(raw: string) {
    const candidates = splitCandidateTags(raw)
    if (candidates.length === 0) {
      setDraft('')
      return
    }

    const next = [...value]
    let firstError: string | null = null

    for (const candidate of candidates) {
      const error = validateTag?.(candidate) ?? null
      if (error) {
        if (!firstError) firstError = error
        continue
      }

      const normalizedCandidate = (normalizeTag ? normalizeTag(candidate) : candidate).trim()
      if (!normalizedCandidate) continue

      if (!valueSet.has(normalizedCandidate) && !next.includes(normalizedCandidate)) {
        next.push(normalizedCandidate)
      }
    }

    if (next.length !== value.length) {
      onChange(next)
    }

    setLocalError(firstError)
    setDraft('')
  }

  return (
    <div>
      {name && (
        <input
          type="hidden"
          name={name}
          value={value.join(',')}
        />
      )}

      <div
        className={
          'field flex flex-wrap items-center gap-2 ' +
          (hasError ? 'field-error' : '')
        }
      >
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-2 px-2 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary border border-primary/30"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              disabled={disabled}
              className="text-primary/80 hover:text-primary disabled:opacity-50 cursor-pointer"
              aria-label={`Remover release ${tag}`}
              title="Remover"
            >
              <i className="fa-solid fa-xmark" aria-hidden="true"></i>
            </button>
          </span>
        ))}

        <input
          id={id}
          type="text"
          value={draft}
          disabled={disabled}
          placeholder={placeholder}
          className="flex-1 min-w-36 bg-transparent outline-none border-none text-sm"
          onChange={(event) => {
            setDraft(event.target.value)
            if (localError) setLocalError(null)
          }}
          onBlur={() => {
            if (draft.trim()) commitRaw(draft)
          }}
          onPaste={(event) => {
            const pasted = event.clipboardData.getData('text')
            if (!pasted) return
            event.preventDefault()
            commitRaw(pasted)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Backspace' && !draft && value.length > 0) {
              event.preventDefault()
              removeTag(value[value.length - 1])
              return
            }

            if (event.key === ',' || event.key === 'Enter' || event.key === 'Tab') {
              if (!draft.trim()) return
              event.preventDefault()
              commitRaw(draft)
            }
          }}
        />
      </div>

      {localError && (
        <p className="text-xs text-destructive mt-1">{localError}</p>
      )}
    </div>
  )
}
