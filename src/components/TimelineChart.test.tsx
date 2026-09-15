// @vitest-environment jsdom

import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ActivityData } from '../vite-env'
import { TimelineChart } from './TimelineChart'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function makeActivity(overrides: Partial<ActivityData> = {}): ActivityData {
  return {
    id: 'a1',
    order: 1,
    description: '<p>Atividade de teste</p>',
    date_start: '2026-10-05',
    date_end: '2026-10-09',
    link_ref: null,
    deployments: null,
    status: 'Em andamento',
    month_reference: '10/2026',
    attendance_type: null,
    project_scope: null,
    last_updated: '2026-10-01T00:00:00.000Z',
    ...overrides,
  }
}

function headerCells() {
  return Array.from(document.querySelectorAll('#dashboard-gantt-header [data-day]'))
}

function columnCells() {
  return Array.from(document.querySelectorAll('#dashboard-gantt-columns [data-day]'))
}

describe('TimelineChart', () => {
  it('renders one header cell and one background column per day, with weekend flags', () => {
    render(<TimelineChart activities={[makeActivity({ month_reference: '02/2028' })]} monthRef="02/2028" onSelect={() => {}} />)

    expect(headerCells()).toHaveLength(29)
    expect(columnCells()).toHaveLength(29)

    // 01/02/2028 é terça-feira → 05/02 (sábado) e 06/02 (domingo) são fim de semana
    const weekendDays = headerCells()
      .filter((cell) => cell.getAttribute('data-weekend') === 'true')
      .map((cell) => Number(cell.getAttribute('data-day')))
    expect(weekendDays).toEqual([5, 6, 12, 13, 19, 20, 26, 27])
    expect(columnCells().map((cell) => cell.getAttribute('data-weekend'))).toEqual(
      headerCells().map((cell) => cell.getAttribute('data-weekend')),
    )
  })

  it('shows the day number and the pt-BR weekday letter in each header cell', () => {
    render(<TimelineChart activities={[makeActivity()]} monthRef="10/2026" onSelect={() => {}} />)

    const first = headerCells()[0]
    expect(first.querySelector('[data-role="day-number"]')?.textContent).toBe('1')
    expect(first.querySelector('[data-role="weekday"]')?.textContent).toBe('Q')
    expect(first.getAttribute('title')).toContain('quinta-feira')

    const saturday = headerCells()[2]
    expect(saturday.querySelector('[data-role="weekday"]')?.textContent).toBe('S')
    expect(saturday.className).toContain('text-accent')
  })

  it('positions the bar on the same percentage scale as the day columns', () => {
    render(<TimelineChart activities={[makeActivity()]} monthRef="10/2026" onSelect={() => {}} />)

    const bar = document.querySelector('[data-activity-bar="a1"]') as HTMLElement
    expect(bar.style.left).toBe(`${(4 / 31) * 100}%`)
    expect(bar.style.width).toBe(`${(5 / 31) * 100}%`)
    expect((headerCells()[0] as HTMLElement).style.width).toBe(`${100 / 31}%`)
    expect(bar.className).toContain('bg-chart-3')
  })

  it('renders the row without a bar when the activity has no dates', () => {
    render(
      <TimelineChart
        activities={[makeActivity({ id: 'undated', date_start: null, date_end: null })]}
        monthRef="10/2026"
        onSelect={() => {}}
      />,
    )

    expect(document.querySelector('[data-activity-label="undated"]')).not.toBeNull()
    expect(document.querySelector('[data-activity-bar="undated"]')).toBeNull()
  })

  it('highlights the column under the pointer and clears it on leave', () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      left: 0, top: 0, right: 620, bottom: 100, width: 620, height: 100, x: 0, y: 0, toJSON: () => ({}),
    } as DOMRect)

    render(<TimelineChart activities={[makeActivity()]} monthRef="10/2026" onSelect={() => {}} />)
    const track = document.getElementById('dashboard-gantt-track') as HTMLElement

    fireEvent.mouseMove(track, { clientX: 30 })
    expect(document.querySelector('#dashboard-gantt-columns [data-day="2"]')?.getAttribute('data-hovered')).toBe('true')
    expect(document.querySelector('#dashboard-gantt-header [data-day="2"]')?.getAttribute('data-hovered')).toBe('true')
    expect(document.querySelectorAll('#dashboard-gantt-columns [data-hovered="true"]')).toHaveLength(1)

    fireEvent.mouseLeave(track)
    expect(document.querySelectorAll('[data-hovered="true"]')).toHaveLength(0)
  })

  it('calls onSelect when the label or the bar is clicked', () => {
    const onSelect = vi.fn()
    render(<TimelineChart activities={[makeActivity()]} monthRef="10/2026" onSelect={onSelect} />)

    fireEvent.click(document.querySelector('[data-activity-label="a1"]') as HTMLElement)
    fireEvent.click(document.querySelector('[data-activity-bar="a1"]') as HTMLElement)
    expect(onSelect).toHaveBeenCalledTimes(2)
    expect(onSelect).toHaveBeenCalledWith('a1')
  })
})
