// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useState } from 'react'
import type { Deployment } from '../utils/deployments'
import { DeploymentsEditor } from './DeploymentsEditor'

afterEach(() => {
  cleanup()
})

/** Wrapper controlado para testar sequências de interação com estado real. */
function Controlled({ initial = [], onChange }: { initial?: Deployment[]; onChange?: (next: Deployment[]) => void }) {
  const [value, setValue] = useState<Deployment[]>(initial)
  return (
    <DeploymentsEditor
      value={value}
      onChange={(next) => { setValue(next); onChange?.(next) }}
      idPrefix="dep"
    />
  )
}

function toggle(env: string): HTMLButtonElement {
  return screen.getByRole('button', { name: new RegExp(`^${env}$`) }) as HTMLButtonElement
}

function addRelease(inputId: string, text: string) {
  const input = document.getElementById(inputId) as HTMLInputElement
  fireEvent.change(input, { target: { value: text } })
  fireEvent.keyDown(input, { key: 'Enter' })
}

describe('DeploymentsEditor', () => {
  it('renders the three environments in order, all unmarked', () => {
    render(<DeploymentsEditor value={[]} onChange={() => {}} idPrefix="dep" />)
    const rows = document.querySelectorAll('[data-environment]')
    expect(Array.from(rows).map((row) => row.getAttribute('data-environment')))
      .toEqual(['Desenvolvimento', 'Homologação', 'Produção'])
    expect(toggle('Desenvolvimento').getAttribute('aria-pressed')).toBe('false')
    expect(screen.getAllByText('Ainda não publicado — clique para marcar.').length).toBe(3)
  })

  it('marks an environment with an empty release list', () => {
    const onChange = vi.fn()
    render(<Controlled onChange={onChange} />)
    fireEvent.click(toggle('Homologação'))
    expect(onChange).toHaveBeenLastCalledWith([{ environment: 'Homologação', releases: [] }])
    expect(toggle('Homologação').getAttribute('aria-pressed')).toBe('true')
    expect(document.getElementById('dep-releases-hmg')).toBeTruthy()
  })

  it('also marks when clicking the "not published" text', () => {
    const onChange = vi.fn()
    render(<Controlled onChange={onChange} />)
    fireEvent.click(document.getElementById('dep-empty-prd')!)
    expect(onChange).toHaveBeenLastCalledWith([{ environment: 'Produção', releases: [] }])
  })

  it('adds releases only to the row being edited', () => {
    const onChange = vi.fn()
    render(<Controlled initial={[{ environment: 'Desenvolvimento', releases: [] }, { environment: 'Produção', releases: ['9'] }]} onChange={onChange} />)
    addRelease('dep-releases-dsv', '12345, 12346')
    expect(onChange).toHaveBeenLastCalledWith([
      { environment: 'Desenvolvimento', releases: ['12345', '12346'] },
      { environment: 'Produção', releases: ['9'] },
    ])
  })

  it('always emits in canonical order regardless of marking order', () => {
    const onChange = vi.fn()
    render(<Controlled onChange={onChange} />)
    fireEvent.click(toggle('Produção'))
    fireEvent.click(toggle('Desenvolvimento'))
    expect(onChange).toHaveBeenLastCalledWith([
      { environment: 'Desenvolvimento', releases: [] },
      { environment: 'Produção', releases: [] },
    ])
  })

  it('retains releases when unmarking and restores them on re-mark', () => {
    const onChange = vi.fn()
    render(<Controlled initial={[{ environment: 'Homologação', releases: ['111', '222'] }]} onChange={onChange} />)

    fireEvent.click(toggle('Homologação'))
    expect(onChange).toHaveBeenLastCalledWith([])
    expect(document.getElementById('dep-releases-hmg')).toBeNull()

    fireEvent.click(toggle('Homologação'))
    expect(onChange).toHaveBeenLastCalledWith([{ environment: 'Homologação', releases: ['111', '222'] }])
  })

  it('offers to repeat releases from the closest marked environment above', () => {
    const onChange = vi.fn()
    render(<Controlled initial={[{ environment: 'Desenvolvimento', releases: ['1', '2'] }]} onChange={onChange} />)

    expect(document.getElementById('dep-repeat-dsv')).toBeNull()
    fireEvent.click(toggle('Produção'))
    const repeat = document.getElementById('dep-repeat-prd')!
    expect(repeat.textContent).toContain('Repetir releases de Desenvolvimento')

    fireEvent.click(repeat)
    expect(onChange).toHaveBeenLastCalledWith([
      { environment: 'Desenvolvimento', releases: ['1', '2'] },
      { environment: 'Produção', releases: ['1', '2'] },
    ])
    // Depois de preencher, o atalho some.
    expect(document.getElementById('dep-repeat-prd')).toBeNull()
  })

  it('does not offer the repeat shortcut when no row above has releases', () => {
    render(<Controlled initial={[{ environment: 'Desenvolvimento', releases: [] }, { environment: 'Homologação', releases: [] }]} />)
    expect(document.getElementById('dep-repeat-hmg')).toBeNull()
  })

  it('rejects non-numeric releases with an inline error', () => {
    const onChange = vi.fn()
    render(<Controlled initial={[{ environment: 'Desenvolvimento', releases: [] }]} onChange={onChange} />)
    addRelease('dep-releases-dsv', 'abc')
    expect(onChange).not.toHaveBeenCalled()
    expect(screen.getByText(/Use apenas números de release SVN/)).toBeTruthy()
  })
})
