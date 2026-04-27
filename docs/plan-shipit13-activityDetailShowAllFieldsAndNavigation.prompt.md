# Plan: Activity Detail — Show All Fields + Prev/Next Navigation

**TL;DR**: Add the missing `project_scope` field to ActivityDetailPage and implement Previous/Next activity navigation (top + bottom) with a toggle to navigate by month or by project scope.

---

## Part A: Display All Activity Fields

Currently only `project_scope` is missing from the detail page. All other entity fields are already displayed.

### Steps

1. **Add `project_scope` to ActivityDetailPage** — render it as a badge/label alongside the existing status/period/attendance/month badges in the info card header. Use a folder or briefcase icon (Font Awesome `fa-folder` or `fa-diagram-project`). If `project_scope` is null/empty, hide the badge.

### Relevant files

- `src/pages/ActivityDetailPage.tsx` — add `project_scope` display in the badges flex-wrap section

---

## Part B: Previous/Next Activity Navigation

Fetch the sibling activities list on page load and compute prev/next based on a selectable mode (by month or by project scope).

### Steps

2. **Fetch sibling activities** — when loading the activity detail, also call `getActivities(month_reference)` to get all activities in the same month (ordered by `order ASC, last_updated DESC`). Store in state as `siblings`. *(blocks 3-5)*
3. **Compute prev/next** — derive `prevActivity` and `nextActivity` from the `siblings` array based on the current activity's position. Support two modes:
   - **By month** (default): all siblings from `getActivities(month_reference)` — same list
   - **By project scope**: filter siblings to those with matching `project_scope`
   - Store nav mode in a `navMode` state (`'month' | 'scope'`); default `'month'`
   - When mode is `'scope'` and current activity has no `project_scope`, fall back to month mode
4. **Create `ActivityNav` component** — reusable component in `src/components/ActivityNav.tsx` that renders:
   - Left arrow + "Atividade Anterior" link (or disabled/grey if no previous)
   - Right arrow + "Próxima Atividade" link (or disabled/grey if no next)
   - Small toggle (icon button or segmented control) to switch between "Mês" and "Projeto" modes
   - Links navigate to `/activities/{siblingId}` — page reloads the new activity
   - Shows activity description preview on hover (title tooltip)
   - Keyboard shortcut: `Alt+←` / `Alt+→` for prev/next *(nice to have)*
5. **Integrate `ActivityNav` in ActivityDetailPage** — render it in two positions:
   - **Top**: between the back/edit header and the info card
   - **Bottom**: after the last-updated timestamp, before end of page
   - Both instances share the same `navMode` state and siblings data

### Relevant files

- `src/pages/ActivityDetailPage.tsx` — add sibling fetch, navMode state, integrate `ActivityNav` top + bottom
- `src/components/ActivityNav.tsx` — **new file**: prev/next navigation component
- `electron/preload.ts` — no changes needed (`getActivities` already exists)
- `electron/database.ts` — no changes needed

---

## Verification

1. `npm run build` — compiles without errors
2. `npm run test` — all existing tests pass
3. **Visual check**: open an activity detail → `project_scope` shows as a badge when present, hidden when null
4. **Visual check**: prev/next links appear top and bottom; first activity has "Anterior" disabled, last has "Próxima" disabled
5. **Navigation**: click "Próxima Atividade" → navigates to next activity, page updates, prev/next recalculate
6. **Toggle**: switch to "Projeto" mode → prev/next only cycles through activities with the same `project_scope`
7. **Edge case**: activity with no `project_scope` → "Projeto" toggle disabled or falls back to month mode
8. **Edge case**: only one activity in month → both links disabled
9. **All 11 themes**: nav component looks correct in all themes (uses theme CSS variables)
10. **Keyboard**: `Alt+←` / `Alt+→` navigate (if implemented)

## Decisions

- **Sibling data source**: reuse `getActivities(month_reference)` — no new IPC method needed. The full month list is typically small (< 50 activities), so fetching the full list is efficient
- **Nav mode default**: "Mês" (month) — aligns with how activities are already organized
- **Disabled state**: grey/disabled links instead of hidden — user always sees the navigation structure exists
- **Component reuse**: single `ActivityNav` component rendered twice (top + bottom) sharing props
- **No pagination/preload**: prev/next just navigates to a new route; the target page fetches its own data

## Further Considerations

1. **ActivityNav showing activity title preview**: the prev/next links could show the sibling activity's truncated description as secondary text (e.g., "Próxima: Implementação do módulo X..."). This makes navigation more informative. *Recommendation*: include it, it's low effort since we already have the siblings array
