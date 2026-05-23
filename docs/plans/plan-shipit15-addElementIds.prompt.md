# Plan: Add IDs to All UI Elements

Assign meaningful `id` attributes to all structural HTML/JSX elements across 18 TSX files (8 pages + 13 components). Goal: facilitate element targeting for CSS customization and developer tooling. Uses kebab-case naming convention with contextual prefixes.

---

## Naming Convention

- **Format:** `kebab-case`, lowercase
- **Pattern:** `{context}-{element}` — e.g., `dashboard-header`, `settings-alerts-section`
- **Pages:** prefix with page name (`dashboard-`, `activities-`, `profile-`, `settings-`, `trash-`, `activity-detail-`, `activity-form-`)
- **Components:** prefix with component name (`titlebar-`, `searchbar-`, `sidebar-`, `header-`, `evidence-upload-`, `theme-selector-`, `activity-nav-`, `text-evidence-editor-`, `text-evidence-modal-`, `empty-state-`)
- **App-level:** prefix with `app-`
- **Existing IDs:** keep as-is (form inputs like `description`, `date_start`, modal titles like `delete-activity-title`)

---

## Phase 1: App Shell & Layout (2 files)

### 1.1 `src/components/AppLayout.tsx`
- `app-layout` → main outer container (h-screen flex)
- `app-main` → main content scrollable area (`<main>`)
- `app-content` → page outlet container (div inside main)

### 1.2 `src/components/TitleBar.tsx`
- `titlebar` → main title bar container
- `titlebar-logo` → logo section (left)
- `titlebar-search` → SearchBar wrapper (center)
- `titlebar-controls` → window controls section (right)
- `titlebar-btn-minimize` → minimize button
- `titlebar-btn-maximize` → maximize/restore button
- `titlebar-btn-close` → close button

---

## Phase 2: Navigation Components (3 files)

### 2.1 `src/components/Header.tsx`
- `header-nav` → `<header>` element
- `header-logo` → logo link wrapper
- `header-nav-links` → `<nav>` element
- `header-link-dashboard` → dashboard NavLink
- `header-link-activities` → activities NavLink
- `header-link-profile` → profile NavLink
- `header-link-settings` → settings NavLink
- `header-link-trash` → trash NavLink
- `header-trash-badge` → trash count badge
- `header-btn-about` → about button
- `header-about-modal` → about modal dialog container
- Keep existing: `about-modal-title-header`

### 2.2 `src/components/ActivityBar.tsx`
- `sidebar` → `<aside>` element
- `sidebar-nav-main` → main `<nav>`
- `sidebar-link-dashboard` → dashboard NavLink
- `sidebar-link-activities` → activities NavLink
- `sidebar-link-profile` → profile NavLink
- `sidebar-nav-bottom` → bottom `<nav>`
- `sidebar-link-trash` → trash NavLink
- `sidebar-trash-badge` → trash count badge
- `sidebar-link-settings` → settings NavLink
- `sidebar-btn-about` → about button
- `sidebar-about-modal` → about modal dialog container
- Keep existing: `about-modal-title-sidebar`

### 2.3 `src/components/SearchBar.tsx`
- `searchbar` → outer container
- `searchbar-input` → text input
- `searchbar-icon` → search/loading icon
- `searchbar-results` → dropdown results container
- `searchbar-empty` → empty results message

---

## Phase 3: Dashboard & Home (2 files)

### 3.1 `src/pages/HomePage.tsx`
- `home-loading` → loading spinner container
- `home-empty` → EmptyState wrapper (if no profile)

### 3.2 `src/pages/DashboardPage.tsx`
- `dashboard-header` → header section (title + button)
- `dashboard-btn-new` → "Nova Atividade" button
- `dashboard-month-selector` → month navigation section
- `dashboard-btn-prev-month` → previous month button
- `dashboard-btn-next-month` → next month button
- `dashboard-month-label` → current month display
- `dashboard-loading` → skeleton loading wrapper
- `dashboard-warning` → incomplete activities banner
- `dashboard-gantt` → Gantt chart section
- `dashboard-report` → report generation section
- Keep existing: `summary-cards`

---

## Phase 4: Activity Pages (3 files)

### 4.1 `src/pages/ActivitiesPage.tsx`
- `activities-header` → header section
- `activities-filters` → filter section (search/status)
- `activities-list` → DndContext list container
- `activities-empty` → empty state message
- `activities-delete-modal` → delete confirmation dialog
- Keep existing: `delete-activity-title`

### 4.2 `src/pages/ActivityDetailPage.tsx`
- `activity-detail` → main content wrapper
- `activity-detail-header` → header section (back + title + meta)
- `activity-detail-nav` → ActivityNav component wrapper
- `activity-detail-info` → details panel (description, dates, etc.)
- `activity-detail-evidence` → evidence gallery section
- `activity-detail-evidence-grid` → sortable evidence grid
- `activity-detail-lightbox` → lightbox container
- `activity-detail-btn-edit` → edit button
- `activity-detail-btn-back` → back button
- `activity-detail-delete-modal` → evidence delete confirmation modal
- Keep existing: `detail-delete-title`

### 4.3 `src/pages/ActivityFormPage.tsx`
- `activity-form` → `<form>` element
- `activity-form-header` → header with title/breadcrumb
- `activity-form-btn-back` → back/cancel button
- `activity-form-btn-submit` → submit button
- `activity-form-autosave` → auto-save status indicator
- `activity-form-errors` → validation errors container
- `activity-form-evidence` → evidence section wrapper
- Keep existing: all 8 form input IDs (`description`, `date_start`, `date_end`, `status`, `attendance_type`, `month_reference`, `project_scope`, `link_ref`)

---

## Phase 5: Profile, Settings, Trash (3 files)

### 5.1 `src/pages/ProfilePage.tsx`
- `profile-form` → `<form>` element
- `profile-header` → header section (icon + title)
- `profile-btn-edit` → edit toggle button
- `profile-btn-cancel` → cancel button
- `profile-btn-submit` → submit button
- `profile-errors` → validation errors container
- Keep existing: all 8 form input IDs (`full_name`, `role`, `seniority_level`, `contract_identifier`, `profile_type`, `attendance_type`, `project_scope`, `correlating_activities`)

### 5.2 `src/pages/SettingsPage.tsx`
- `settings` → main settings container
- `settings-reports-section` → reports directory section
- `settings-reports-btn-select` → select directory button
- `settings-reports-btn-reset` → reset directory button
- `settings-sounds-section` → sound preferences section
- `settings-autolaunch-section` → auto-launch section
- `settings-autolaunch-toggle` → auto-launch toggle
- `settings-alerts-section` → alert configuration section
- `settings-alerts-toggle` → alert enable/disable toggle
- `settings-alerts-days` → alert days container
- `settings-alerts-time` → alert time input
- `settings-alerts-sound-toggle` → sound enabled toggle
- `settings-alerts-btn-save` → save alert button
- `settings-update-section` → update checker section
- `settings-update-btn-check` → check for update button
- `settings-update-btn-install` → install update button
- `settings-theme-section` → theme selector section
- `settings-version` → version display

### 5.3 `src/pages/TrashPage.tsx`
- `trash-header` → page header
- `trash-btn-empty` → empty trash button
- `trash-grid` → evidence grid container
- `trash-lightbox` → lightbox container
- `trash-delete-modal` → delete confirmation modal
- `trash-empty-modal` → empty trash confirmation modal
- Keep existing: `trash-delete-title`, `trash-empty-title`

---

## Phase 6: Reusable Components (5 files)

### 6.1 `src/components/EvidenceUpload.tsx`
- `evidence-upload` → main container
- `evidence-upload-dropzone` → drag-and-drop zone
- `evidence-upload-tabs` → upload type buttons (image/text)
- `evidence-upload-grid` → sortable evidence grid
- `evidence-upload-file-input` → hidden file input

### 6.2 `src/components/TextEvidenceModal.tsx`
- `text-evidence-modal` → modal dialog wrapper
- `text-evidence-modal-backdrop` → backdrop overlay
- `text-evidence-modal-header` → modal header section
- `text-evidence-modal-btn-close` → close button
- `text-evidence-modal-body` → modal body
- `text-evidence-modal-footer` → modal footer
- `text-evidence-modal-btn-cancel` → cancel button
- `text-evidence-modal-btn-save` → save button
- Keep existing: `text-evidence-modal-title`, `text-ev-caption`

### 6.3 `src/components/TextEvidenceEditor.tsx`
- `text-evidence-editor` → editor container
- `text-evidence-editor-toolbar` → toolbar container
- `text-evidence-editor-content` → EditorContent wrapper
- `text-evidence-editor-counter` → character counter

### 6.4 `src/components/ThemeSelector.tsx`
- `theme-selector` → main container
- `theme-selector-category-{categoryKey}` → per-category sections (dynamic)
- `theme-selector-grid-{categoryKey}` → per-category grids (dynamic)

### 6.5 `src/components/EmptyState.tsx` & `src/components/ActivityNav.tsx`
- `empty-state` → main container
- `empty-state-btn` → "Criar Perfil" button
- `activity-nav` → main nav container
- `activity-nav-btn-prev` → previous activity button
- `activity-nav-btn-next` → next activity button
- `activity-nav-mode-toggle` → mode toggle section
- `activity-nav-btn-month` → month toggle button
- `activity-nav-btn-scope` → project/scope toggle button

---

## Out of Scope

- **Skeleton.tsx** — decorative loading placeholders, no practical benefit
- **EvidenceLightbox.tsx** — wraps third-party library (yet-another-react-lightbox), manages own DOM
- **App.tsx** — only renders providers/router, no visible DOM elements worth IDing
- **Dynamic list items** — activity/evidence cards use React `key`, not static `id` (avoids duplicates)
- **`data-testid`** — out of scope; this plan focuses on `id` attributes only

---

## Verification

1. `npm run build` — no TS errors
2. `npm run test` — all 54+ unit tests pass
3. `npm run test:e2e` — all 4 E2E scenarios pass
4. Grep `id="` across all TSX files to validate coverage
5. Verify no duplicate IDs: `grep -roh 'id="[^"]*"' src/ | sort | uniq -d` should return empty
6. Manual spot check: open DevTools in Electron, verify key IDs appear on DOM elements

---

## Summary

| Phase | Files | New IDs (approx.) |
|-------|-------|--------------------|
| 1 — Shell & Layout | 2 | ~10 |
| 2 — Navigation | 3 | ~25 |
| 3 — Dashboard & Home | 2 | ~12 |
| 4 — Activities | 3 | ~20 |
| 5 — Profile/Settings/Trash | 3 | ~25 |
| 6 — Components | 5 | ~20 |
| **Total** | **18 files** | **~112 new IDs** |

All phases are independent and can be executed in parallel. No phase blocks another.
