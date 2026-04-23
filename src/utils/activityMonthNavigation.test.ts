import { describe, expect, it } from 'vitest'
import type { ActivityData } from '../vite-env'
import {
  resolveMonthNavigation,
  shouldSyncSelectedMonthToActivity,
} from './activityMonthNavigation'

type ActivityStub = Pick<ActivityData, 'id' | 'month_reference'>

function activity(id: string, month: string): ActivityStub {
  return { id, month_reference: month }
}

describe('resolveMonthNavigation', () => {
  const baseState = {
    currentId: 'A',
    activity: activity('A', '04/2026'),
    selectedMonth: '04/2026',
    siblings: [activity('A', '04/2026')] as ActivityStub[],
    siblingsMonthReference: '04/2026',
    siblingsLoading: false,
  }

  it('returns noop when no month is selected yet', () => {
    expect(
      resolveMonthNavigation({ ...baseState, selectedMonth: '' })
    ).toEqual({ type: 'noop' })
  })

  it('returns noop while siblings are loading', () => {
    expect(
      resolveMonthNavigation({ ...baseState, siblingsLoading: true })
    ).toEqual({ type: 'noop' })
  })

  it('returns noop while siblings belong to a different month', () => {
    expect(
      resolveMonthNavigation({
        ...baseState,
        selectedMonth: '05/2026',
        siblingsMonthReference: '04/2026',
      })
    ).toEqual({ type: 'noop' })
  })

  it('returns noop when loaded activity does not match current route id (stale)', () => {
    expect(
      resolveMonthNavigation({
        ...baseState,
        currentId: 'B',
        activity: activity('A', '04/2026'),
      })
    ).toEqual({ type: 'noop' })
  })

  it('returns noop when activity is null (still loading)', () => {
    expect(
      resolveMonthNavigation({ ...baseState, activity: null })
    ).toEqual({ type: 'noop' })
  })

  it('clears empty-month flag when selected month equals the loaded activity month', () => {
    expect(resolveMonthNavigation(baseState)).toEqual({
      type: 'clear-empty-month',
    })
  })

  it('navigates to the first sibling when the selected month differs and has activities', () => {
    const decision = resolveMonthNavigation({
      ...baseState,
      activity: activity('A', '04/2026'),
      selectedMonth: '05/2026',
      siblings: [activity('X', '05/2026'), activity('Y', '05/2026')],
      siblingsMonthReference: '05/2026',
    })
    expect(decision).toEqual({ type: 'navigate', targetId: 'X' })
  })

  it('does NOT navigate if already on the first sibling of the selected month', () => {
    const decision = resolveMonthNavigation({
      ...baseState,
      currentId: 'X',
      activity: activity('X', '05/2026'),
      selectedMonth: '05/2026',
      siblings: [activity('X', '05/2026'), activity('Y', '05/2026')],
      siblingsMonthReference: '05/2026',
    })
    expect(decision).toEqual({ type: 'clear-empty-month' })
  })

  it('surfaces empty-month state when the selected month has no activities', () => {
    expect(
      resolveMonthNavigation({
        ...baseState,
        selectedMonth: '07/2026',
        siblings: [],
        siblingsMonthReference: '07/2026',
      })
    ).toEqual({ type: 'show-empty-month', monthReference: '07/2026' })
  })

  // This is the regression test that covers the "bouncing back" bug:
  // after the route id changed to a new activity but the new activity has not
  // loaded yet, the helper must not suggest navigating back to the previous one.
  it('does not suggest navigation while the new activity is still loading', () => {
    const decision = resolveMonthNavigation({
      currentId: 'X',
      // Stale activity still loaded (belongs to previous month).
      activity: activity('A', '04/2026'),
      // User has already reset selection to new month (and fetch completed).
      selectedMonth: '05/2026',
      siblings: [activity('X', '05/2026')],
      siblingsMonthReference: '05/2026',
      siblingsLoading: false,
    })
    expect(decision).toEqual({ type: 'noop' })
  })
})

describe('shouldSyncSelectedMonthToActivity', () => {
  it('returns true when activity matches current id and no month is selected', () => {
    expect(
      shouldSyncSelectedMonthToActivity({
        currentId: 'A',
        activity: activity('A', '04/2026'),
        selectedMonth: '',
      })
    ).toBe(true)
  })

  it('returns false when a month is already selected', () => {
    expect(
      shouldSyncSelectedMonthToActivity({
        currentId: 'A',
        activity: activity('A', '04/2026'),
        selectedMonth: '03/2026',
      })
    ).toBe(false)
  })

  it('returns false when activity is null', () => {
    expect(
      shouldSyncSelectedMonthToActivity({
        currentId: 'A',
        activity: null,
        selectedMonth: '',
      })
    ).toBe(false)
  })

  // Regression guard: prevents syncing the selected month to a stale activity
  // that still belongs to the previous route.
  it('returns false when activity id does not match current route id (stale)', () => {
    expect(
      shouldSyncSelectedMonthToActivity({
        currentId: 'X',
        activity: activity('A', '04/2026'),
        selectedMonth: '',
      })
    ).toBe(false)
  })

  it('returns false when activity has no month_reference', () => {
    expect(
      shouldSyncSelectedMonthToActivity({
        currentId: 'A',
        activity: { id: 'A', month_reference: '' } as ActivityStub,
        selectedMonth: '',
      })
    ).toBe(false)
  })
})
