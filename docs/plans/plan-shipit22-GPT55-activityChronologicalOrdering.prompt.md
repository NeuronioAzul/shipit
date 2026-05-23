## Plan: Activity Chronological Ordering

Fix the ordering mismatch at the data-ordering layer, not in the visual activity cards or evidence flows. The recommended approach is to ensure every activity has a stable `order` value, append newly created activities to the end of their month, and use creation order as the fallback tie-breaker so the Activities screen and DOCX payload receive activities in the same order source.

**Steps**
1. Add a small ordering helper in `electron/database.ts` to normalize missing activity orders per month. It should preserve existing non-null `order` values, sort legacy null-order activities by creation fallback (`id ASC`, because activities use UUID v7), and assign those missing orders after the current max order for that month. This handles old data where recently inserted activities still have `order = null`.
2. Update `saveActivity` in `electron/database.ts` for new activities only. Before creating a new row, normalize the target month and compute the next `order` from the current max for `month_reference`, then set that order on the created activity. Existing activity updates must keep their current `order` unless explicitly changed by reorder.
3. Update monthly reads in `electron/database.ts`: `getActivities(monthReference)` and `getReportPayload(monthReference)` should normalize missing orders for that month before querying, then query by `order ASC` with `id ASC` as the creation-order fallback instead of `last_updated DESC`.
4. Update `searchActivities(query)` in `electron/database.ts` so search-mode results also respect persisted activity order. Normalize months that contain null-order rows before searching, then order search results by month and activity order/creation fallback rather than only `last_updated DESC`.
5. Keep `reorderActivities(items)` and the drag-and-drop UI contract unchanged. It should continue saving the user-defined order indexes passed by `ActivitiesPage`.
6. Keep `src/pages/ActivitiesPage.tsx` numbering unchanged (`idx + 1`). Once the backend returns the correct order, the displayed activity number follows the same list order without extra UI logic.
7. Optionally align browser fallback in `src/services/localDb.ts`: compute new activity order from max existing order for the month instead of count, and keep sorting by `order` with original localStorage insertion position as a fallback. This keeps development/browser behavior consistent without touching Electron evidence flows.
8. Add focused tests in `electron/database.test.ts`: new activities without explicit order append in insertion order; legacy null-order activities are normalized chronologically; drag-and-drop reorder remains authoritative; `getReportPayload` returns the same order as `getActivities`; `searchActivities` respects activity order.
9. Add a lightweight DOCX confidence test in `electron/report-generator.integration.test.ts` only if needed: for activities in the same `project_scope`, generated document XML should contain descriptions in activity order. Do not change image/text evidence handling.

**Relevant files**
- `d:/Programacao/Electron/ship-it/electron/database.ts` — root fix for save, read, search, and report payload ordering.
- `d:/Programacao/Electron/ship-it/electron/entities/Activity.ts` — confirms no `created_at`; `id` is UUID v7 and `last_updated` is not safe as creation fallback.
- `d:/Programacao/Electron/ship-it/src/pages/ActivitiesPage.tsx` — reference only; displayed numbering is already array-index based and drag-and-drop persists `{ id, order }`.
- `d:/Programacao/Electron/ship-it/src/services/localDb.ts` — optional fallback consistency for browser mode.
- `d:/Programacao/Electron/ship-it/electron/report-generator.ts` — reference only; preserve current project grouping and evidence ordering unless a separate report-layout change is requested.
- `d:/Programacao/Electron/ship-it/electron/database.test.ts` — add regression coverage for ordering and reorder behavior.
- `d:/Programacao/Electron/ship-it/electron/report-generator.integration.test.ts` — optional DOCX order regression around generated XML.

**Verification**
1. Run targeted Vitest tests: `npm run test -- electron/database.test.ts electron/report-generator.integration.test.ts`.
2. Run `npm run build` to validate renderer and Electron TypeScript after database changes.
3. Manual smoke test in the app: create three activities in the same month, confirm the newest appears last; drag the last one upward and confirm reload preserves the custom order; generate a DOCX and confirm the activity numbering follows the same ordered payload.
4. Manual regression boundary: add/view image or text evidences on an existing activity to confirm evidence upload/display was not touched by the ordering change.

**Decisions**
- Included: activity creation order, legacy null `order` repair, monthly list order, DOCX payload order, search result order, and focused tests.
- Excluded: changing image/video/text evidence flows, modifying the drag-and-drop component behavior, changing the visual numbering formula, or redesigning DOCX project grouping.
- DOCX grouping note: the existing report generator groups activities by `project_scope`. This plan preserves that working behavior. If a month intentionally interleaves different project scopes and the desired output is a perfectly flat 1:1 order with the screen, that is a separate report-layout decision because it changes the current Encarte A structure.
