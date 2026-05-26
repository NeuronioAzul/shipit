# Plan: Layout Consistency + Evidence Lightbox

**TL;DR**: Unify page widths into two tiers (content pages `max-w-6xl`, form pages `max-w-4xl`) and add `yet-another-react-lightbox` with Zoom/Captions plugins for evidence images across all pages.

---

## Part A: Layout Consistency

Standardize page container widths into two groups:

| Tier | Pages | Current | New |
|------|-------|---------|-----|
| **Content** | DashboardPage | `max-w-6xl` | `max-w-6xl` (no change) |
| **Content** | ActivitiesPage | `max-w-4xl` | `max-w-6xl` |
| **Content** | ActivityDetailPage | `max-w-3xl` | `max-w-6xl` |
| **Content** | TrashPage | `max-w-4xl` | `max-w-6xl` |
| **Form** | ActivityFormPage | `max-w-3xl` | `max-w-4xl` |
| **Form** | ProfilePage | `max-w-2xl` | `max-w-4xl` |
| **Form** | SettingsPage | `max-w-2xl` | `max-w-4xl` |

### Steps

1. **ActivitiesPage** — change outermost div from `max-w-4xl` to `max-w-6xl` *(parallel with 2-6)*
2. **ActivityDetailPage** — change from `max-w-3xl` to `max-w-6xl`; update evidence grid from `grid-cols-1 sm:grid-cols-2` to `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` to fill wider space
3. **TrashPage** — change from `max-w-4xl` to `max-w-6xl` (already has 3-col grid, good)
4. **ActivityFormPage** — change from `max-w-3xl` to `max-w-4xl`
5. **ProfilePage** — change from `max-w-2xl` to `max-w-4xl`; review form field grid to use wider space well
6. **SettingsPage** — change from `max-w-2xl` to `max-w-4xl`

### Relevant files

- `src/pages/ActivitiesPage.tsx` — change outermost `max-w-4xl` to `max-w-6xl`
- `src/pages/ActivityDetailPage.tsx` — change `max-w-3xl` to `max-w-6xl`, expand evidence grid
- `src/pages/TrashPage.tsx` — change `max-w-4xl` to `max-w-6xl`
- `src/pages/ActivityFormPage.tsx` — change `max-w-3xl` to `max-w-4xl`
- `src/pages/ProfilePage.tsx` — change `max-w-2xl` to `max-w-4xl`
- `src/pages/SettingsPage.tsx` — change `max-w-2xl` to `max-w-4xl`

---

## Part B: Evidence Lightbox

Add `yet-another-react-lightbox` (v3.31, MIT, 0 deps, React 19 compatible) with Zoom + Captions plugins for click-to-open image viewing with navigation across all evidence images.

### Steps

7. **Install dependency**: `npm install yet-another-react-lightbox` *(blocks 8-11)*
8. **Create `EvidenceLightbox` component** — reusable wrapper in `src/components/EvidenceLightbox.tsx` that:
   - Accepts `slides` array (src + caption from evidence data) and `open`/`onClose`/`index` props
   - Imports Zoom plugin for pinch/scroll zoom
   - Imports Captions plugin to show evidence caption below image
   - Imports Counter plugin to show "1 / N"
   - Imports the library CSS (`yet-another-react-lightbox/styles.css`)
   - Uses `shipit-evidence://` protocol URLs for image sources
   - Styled to respect theme (dark overlay)
9. **Integrate in ActivityDetailPage** — add `onClick` to evidence images → open lightbox at clicked index; pass all evidences as slides *(parallel with 10-11)*
10. **Integrate in EvidenceUpload** — same pattern: click opens lightbox at index; pass evidences as slides
11. **Integrate in TrashPage** — same pattern for trash evidence images (use `shipit-evidence://` URLs)

### Relevant files

- `package.json` — new dependency `yet-another-react-lightbox`
- `src/components/EvidenceLightbox.tsx` — **new file**: reusable lightbox component
- `src/pages/ActivityDetailPage.tsx` — add lightbox state + onClick on images
- `src/components/EvidenceUpload.tsx` — add lightbox state + onClick on images
- `src/pages/TrashPage.tsx` — add lightbox state + onClick on images

---

## Verification

1. `npm run build` — compiles without errors
2. `npm run test` — all 54+ tests pass
3. **Visual check (manual)**: open each page and verify widths feel consistent — content pages fill the same area, form pages are proportionally narrower
4. **Visual check**: ActivityDetailPage → click evidence image → lightbox opens, zoom works, captions show, navigate between images with arrows/keyboard
5. **Visual check**: ActivityFormPage (EvidenceUpload) → click evidence → lightbox opens
6. **Visual check**: TrashPage → click evidence → lightbox opens (image may be dimmed in grid but full brightness in lightbox)
7. **Visual check**: test all 11 themes — lightbox overlay should look good on all themes (dark overlay is theme-neutral)
8. **Keyboard**: `Escape` closes lightbox, arrow keys navigate, scroll wheel zooms

## Decisions

- **Library**: `yet-another-react-lightbox` — chosen over `react-image-lightbox` (deprecated, React 19 incompatible) and `lightbox2` (jQuery-based)
- **Width tiers**: 2 tiers (`max-w-6xl` content, `max-w-4xl` forms) instead of single width — forms don't benefit from extreme width
- **ActivityDetailPage evidence grid**: expanded to 3 columns at `lg` breakpoint to fill wider space
- **Lightbox scope**: all pages with evidence images (ActivityDetail, EvidenceUpload, Trash)
- **Plugins**: Zoom + Captions + Counter (not Thumbnails — evidence count is usually small, thumbnails add unnecessary complexity)

## Further Considerations

1. **ProfilePage field layout**: with `max-w-4xl` the 2-column form grid will have more horizontal space. Fields may need `max-w-sm` on inputs to avoid excessively wide single-line fields, or the grid could move to 3 columns for some sections. *Recommendation*: test visually first, adjust if needed
2. **SettingsPage ThemeSelector**: the ThemeSelector grid already uses `grid-cols-2 sm:grid-cols-3`, which should work well at `max-w-4xl`. No changes expected
