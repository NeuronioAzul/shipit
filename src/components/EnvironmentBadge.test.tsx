// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { EnvironmentBadge } from './EnvironmentBadge'

afterEach(() => {
  cleanup()
})

describe('EnvironmentBadge', () => {
  it('renders the abbreviation, icon and full name in the tooltip', () => {
    render(<EnvironmentBadge environment="Produção" />)
    const badge = screen.getByText('prd')
    expect(badge).toBeTruthy()
    expect(badge.className).toContain('chart-5')
    expect(badge.getAttribute('title')).toBe('Ambiente: Produção')
    expect(badge.querySelector('i')?.className).toContain('fa-rocket')
  })

  it('renders nothing when the environment is empty', () => {
    const { container } = render(<EnvironmentBadge environment={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('applies the compact size classes', () => {
    render(<EnvironmentBadge environment="Desenvolvimento" size="sm" />)
    expect(screen.getByText('dsv').className).toContain('text-[11px]')
  })
})
