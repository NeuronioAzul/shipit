import type { ActivityData } from '../vite-env'

export interface MonthNavigationState {
  /** Route id (activity id on URL). */
  currentId: string | undefined
  /** Full activity loaded for current id, or null while loading. */
  activity: Pick<ActivityData, 'id' | 'month_reference'> | null
  /** Month currently selected by the user (MM/YYYY). */
  selectedMonth: string
  /** Activities fetched for the month currently associated with `siblingsMonthReference`. */
  siblings: Array<Pick<ActivityData, 'id'>>
  /** Month (MM/YYYY) the `siblings` list belongs to. */
  siblingsMonthReference: string
  /** True while a siblings fetch is in flight. */
  siblingsLoading: boolean
}

export type MonthNavigationDecision =
  | { type: 'noop' }
  | { type: 'navigate'; targetId: string }
  | { type: 'show-empty-month'; monthReference: string }
  | { type: 'clear-empty-month' }

/**
 * Pure decision function used by the detail page to decide how to react when the
 * user selects a month that differs from the currently loaded activity.
 *
 * The goal is to avoid "bouncing back" issues: the function only acts when the
 * loaded activity actually corresponds to the current URL id AND when the sibling
 * list matches the month the user selected. Any mismatch yields `noop` so that
 * pending async fetches have time to converge.
 */
export function resolveMonthNavigation(state: MonthNavigationState): MonthNavigationDecision {
  const {
    currentId,
    activity,
    selectedMonth,
    siblings,
    siblingsMonthReference,
    siblingsLoading,
  } = state

  // Not ready yet — wait for selection / fetches / activity load to settle.
  if (!selectedMonth) return { type: 'noop' }
  if (siblingsLoading) return { type: 'noop' }
  if (siblingsMonthReference !== selectedMonth) return { type: 'noop' }
  if (!activity || activity.id !== currentId) return { type: 'noop' }

  // User is back on the same month as the loaded activity — nothing to do, but
  // ensure the "empty month" flag is cleared.
  if (activity.month_reference === selectedMonth) {
    return { type: 'clear-empty-month' }
  }

  // Target month has activities: navigate to the first one (if not already on it).
  if (siblings.length > 0) {
    const target = siblings[0]
    if (target.id === currentId) {
      return { type: 'clear-empty-month' }
    }
    return { type: 'navigate', targetId: target.id }
  }

  // Target month is empty — surface the empty-state UI.
  return { type: 'show-empty-month', monthReference: selectedMonth }
}

/**
 * Given the same navigation state, decides whether it is safe to sync
 * `selectedMonth` to the loaded activity's `month_reference`.
 *
 * We only sync when:
 *  - the loaded activity matches the current URL id (avoids using stale data
 *    from a previous route while the next activity is still loading), and
 *  - the user hasn't already chosen a month.
 */
export function shouldSyncSelectedMonthToActivity(state: {
  currentId: string | undefined
  activity: Pick<ActivityData, 'id' | 'month_reference'> | null
  selectedMonth: string
}): boolean {
  const { currentId, activity, selectedMonth } = state

  if (selectedMonth) return false
  if (!activity) return false
  if (!activity.month_reference) return false
  if (activity.id !== currentId) return false

  return true
}
