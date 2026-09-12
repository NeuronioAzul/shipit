// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DeploymentPipeline } from './DeploymentPipeline'

const copyTextToClipboard = vi.fn()
vi.mock('../utils/clipboard', () => ({
  copyTextToClipboard: (...args: unknown[]) => copyTextToClipboard(...args),
}))

afterEach(() => {
  cleanup()
  copyTextToClipboard.mockClear()
})

function slots() {
  return Array.from(document.querySelectorAll('[data-environment]'))
}

describe('DeploymentPipeline', () => {
  it('renders nothing when no environment is marked', () => {
    const { container } = render(<DeploymentPipeline deployments={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders the three slots when at least one environment is marked', () => {
    render(<DeploymentPipeline deployments={[{ environment: 'Homologação', releases: [] }]} />)
    const rendered = slots()
    expect(rendered.map((slot) => slot.getAttribute('data-environment')))
      .toEqual(['Desenvolvimento', 'Homologação', 'Produção'])
    expect(rendered.map((slot) => slot.getAttribute('data-marked'))).toEqual(['false', 'true', 'false'])
    expect(screen.getByText('hmg').className).toContain('chart-4')
    expect(screen.getByText('prd').getAttribute('title')).toBe('Ainda não publicado em Produção')
    expect(screen.getByText('prd').className).toContain('border-dashed')
  })

  it('shows releases with truncation and describes them in the label', () => {
    render(
      <DeploymentPipeline
        showReleases
        maxReleasesPerEnv={2}
        deployments={[{ environment: 'Desenvolvimento', releases: ['1', '2', '3', '4'] }]}
      />,
    )
    expect(screen.getByRole('button', { name: 'Copiar release 1' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Copiar release 2' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Copiar release 3' })).toBeNull()
    expect(screen.getByText('+2')).toBeTruthy()
    expect(slots()[0].getAttribute('title')).toBe('Publicado em Desenvolvimento — releases 1, 2, 3, 4')
  })

  it('hides releases unless showReleases is set', () => {
    render(<DeploymentPipeline deployments={[{ environment: 'Produção', releases: ['777'] }]} />)
    expect(screen.queryByText('777')).toBeNull()
  })

  it('copies a release on click without propagating to the parent', () => {
    const parentClick = vi.fn()
    render(
      <div onClick={parentClick}>
        <DeploymentPipeline showReleases deployments={[{ environment: 'Produção', releases: ['777'] }]} />
      </div>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Copiar release 777' }))
    expect(copyTextToClipboard).toHaveBeenCalledWith('777', 'Release 777')
    expect(parentClick).not.toHaveBeenCalled()
  })

  it('applies compact classes for size sm', () => {
    render(<DeploymentPipeline size="sm" deployments={[{ environment: 'Desenvolvimento', releases: [] }]} />)
    expect(screen.getByText('dsv').className).toContain('text-[11px]')
  })
})
