// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { EnvironmentSelector } from './EnvironmentSelector'

afterEach(() => {
  cleanup()
})

describe('EnvironmentSelector', () => {
  it('renders the three environment options', () => {
    render(<EnvironmentSelector value="" onChange={() => {}} />)
    expect(screen.getByRole('button', { name: /Desenvolvimento/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Homologação/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Produção/ })).toBeTruthy()
  })

  it('selects an environment on click', () => {
    const onChange = vi.fn()
    render(<EnvironmentSelector value="" onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /Homologação/ }))
    expect(onChange).toHaveBeenCalledWith('Homologação')
  })

  it('clears the selection when the already-selected option is clicked', () => {
    const onChange = vi.fn()
    render(<EnvironmentSelector value="Produção" onChange={onChange} />)
    const selected = screen.getByRole('button', { name: /Produção/ })
    expect(selected.getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(selected)
    expect(onChange).toHaveBeenCalledWith('')
  })

  it('marks only the active option as pressed', () => {
    render(<EnvironmentSelector value="Desenvolvimento" onChange={() => {}} />)
    expect(screen.getByRole('button', { name: /Desenvolvimento/ }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: /Produção/ }).getAttribute('aria-pressed')).toBe('false')
  })
})
