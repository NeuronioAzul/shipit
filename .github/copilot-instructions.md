# ShipIt — Project Guidelines

Electron desktop app (v1.2.2) for software engineers to track activities, generate service reports (DOCX), and manage evidence. Built with Electron 41 + React 19 + Vite 8 + TypeORM + better-sqlite3.

## Tech Stack

| Layer | Tech | Notes |
|-------|------|-------|
| Desktop | Electron 41 (CommonJS) | Context isolation, preload bridge, system tray |
| UI | React 19 + React Router 7 | SPA with `AppLayout` wrapper, `HashRouter` |
| Styling | Tailwind CSS 4 | `@theme inline` in `src/index.css`, no config file |
| ORM | TypeORM 0.3 + better-sqlite3 | SQLite stored in `userData/shipit.db` |
| Build | Vite 8 | `@vitejs/plugin-react` + `@tailwindcss/vite` |
| Language | TypeScript 6 | Strict mode everywhere |
| Icons | Font Awesome 7 | Self-hosted via npm, imported in CSS |
| Reports | JSZip + @xmldom/xmldom + xpath | DOCX generation from OpenXML template |
| Drag & Drop | @dnd-kit (core + sortable) | Activity and evidence reorder |
| Toasts | sonner 2 | Non-blocking notifications |
| Auto-update | electron-updater 6 | GitHub Releases integration |
| Testing | Vitest + Playwright | 54+ unit/integration tests, 4 E2E scenarios |

## Build & Dev Commands

```bash
npm run dev       # Vite dev server + Electron (concurrently + wait-on)
npm run build     # tsc → vite build → tsc electron
npm run dist      # build + electron-builder package
npm run test      # Vitest unit tests
npm run test:e2e  # Playwright E2E tests
npm run preview   # Vite preview
```

Build targets: Windows (NSIS/Portable/MSI x64), macOS (DMG arm64+x64), Linux (AppImage/deb/rpm).

Requires **Node.js ≥ 24**, **npm ≥ 11**. After cloning, `npm install` triggers `postinstall` for native module rebuild.

## Architecture

### Process Boundary

```
Renderer (React/Vite)          Preload Bridge              Main (Electron/Node)
  window.electronAPI  ──────>  contextBridge  ──────>  ipcMain.handle('db:*', 'app:*', 'window:*')
                               electron/preload.ts         electron/main.ts
                                                           electron/database.ts
                                                           electron/report-generator.ts
```

- **Main process** (`electron/`): CommonJS, `tsconfig.electron.json`, outputs to `dist-electron/`
- **Renderer** (`src/`): ESNext, `tsconfig.json`, bundled by Vite
- **IPC pattern**: `ipcRenderer.invoke` ↔ `ipcMain.handle` with `db:`, `app:`, and `window:` prefixes
- **Security**: `contextIsolation: true`, `nodeIntegration: false` — never change these
- **Custom protocols**: `shipit-evidence://` and `shipit-sfx://` for safe file serving from userData

### IPC Handlers (70+ methods)

| Group | Prefix | Key Handlers |
|-------|--------|-------------|
| Profile | `db:` | `getUserProfile`, `saveUserProfile` |
| Activities | `db:` | `getActivities(month)`, `searchActivities(query)`, `getActivity`, `saveActivity`, `deleteActivity`, `reorderActivities` |
| Evidence | `db:` | `saveEvidence`, `saveEvidenceFromBuffer` (clipboard), `updateEvidenceCaption`, `deleteEvidence` (soft), `reorderEvidences`, `getDeletedEvidences`, `restoreEvidence`, `permanentlyDeleteEvidence` |
| Reports | `app:` / `db:` | `generateReport(month)`, `openFileInFolder`, `getReports(month)` |
| Settings | `app:` | `getSettings`, `saveSettings`, `getDefaultReportsDir` |
| Dialogs | `app:` | `selectImages`, `selectDirectory` |
| Tray | `app:` | `setTrayStatus('default'\|'green'\|'yellow'\|'red')` |
| Sounds | `app:` | `listSounds`, `playSound` |
| Auto-launch | `app:` | `getAutoLaunch`, `setAutoLaunch` |
| Alerts | `db:` | `getAlert`, `saveAlert` |
| Auto-update | `app:` | `checkForUpdate`, `installUpdate` |
| Window | `window:` | `minimize`, `maximize`, `close`, `isMaximized` |

### Background Schedulers

- **Alert checker**: every 60s, fires native notifications based on user config
- **Tray status updater**: every 5 min, updates icon color based on incomplete activity count
- **Trash cleanup**: on startup, permanently deletes evidences soft-deleted > 3 months ago

### Browser Fallback

When `window.electronAPI` is unavailable (browser dev), components fall back to `localStorage`. Always check availability before calling IPC methods.

### Database

- Singleton `DataSource` initialized lazily via `initDatabase()` in `electron/database.ts`
- `synchronize: true` — schema auto-updates from entity definitions (dev only)
- Entities use TypeORM decorators with UUID v7 primary keys (except `UserProfile` and `Alert` which use auto-increment)
- 6 entities: `UserProfile`, `Activity`, `Evidence`, `Report`, `ActivityReport` (junction), `Alert`

### Data Model

| Entity | PK | Key Fields | Relations |
|--------|----|-----------|-----------|
| `UserProfile` | auto-inc | `full_name`, `role`, `seniority_level`, `attendance_type`, `project_scope` | 1:1 → Alert |
| `Activity` | UUID v7 | `description`, `date_start/end`, `status`, `project_scope`, `link_ref`, `month_reference`, `order` | 1:N → Evidence, M:N → Report |
| `Evidence` | UUID v7 | `file_path`, `caption`, `sort_index`, `date_added`, `deleted_at` (soft-delete) | N:1 → Activity |
| `Report` | UUID v7 | `month_reference`, `file_path`, `report_name`, `date_generated`, `status` | M:N → Activity |
| `ActivityReport` | — | Junction table (`activities_report`) | Activity ↔ Report |
| `Alert` | auto-inc | `alert_enabled`, `alert_time`, `alert_days_before` (JSON), `alert_frequency`, `alert_sound_file`, `last_alert_sent` | N:1 → UserProfile |

### Routes

```
/                       → HomePage         (Dashboard: Gantt chart, activity summary cards)
/profile                → ProfilePage      (User profile setup + alert config)
/settings               → SettingsPage     (Theme, notifications, auto-launch, reports dir, updates)
/trash                  → TrashPage        (Soft-deleted evidence recovery/permanent deletion)
/activities             → ActivitiesPage   (Monthly activity list, search, drag-reorder)
/activities/new         → ActivityFormPage  (Create new activity)
/activities/:id         → ActivityDetailPage (View/edit details, evidence gallery)
/activities/:id/edit    → ActivityFormPage  (Edit existing activity)
```

Layout: `ThemeProvider` → `HashRouter` → `ElectronNavigator` → `AppLayout` → Route outlet

### Report Generation (DOCX)

- Template-based OpenXML manipulation via JSZip + xmldom
- **Encarte A**: activities grouped by `project_scope`, checkboxes per attendance type
- **Encarte B**: evidence images (one per page) with captions and PAGEREF bookmarks
- Image auto-scaling to fit page area (~15.5cm × 22cm), converted to EMU
- Output: `RELATÓRIO DE SERVIÇO - {CARGO}_{NAME}_{MONTH}.docx`

### Theming

- CSS variables defined in `src/index.css` under `@theme inline` (Tailwind v4 pattern)
- Light/dark via `.dark` class on `<html>`, managed by `ThemeContext`
- Brand colors: primary blue (`rgb(12, 53, 109)`), accent orange (`rgb(232, 110, 33)`)
- WCAG AA compliant contrast ratios
- Persist theme choice in `localStorage.shipit-theme`

## File Structure

```
electron/                   # Main process (CommonJS)
  main.ts                   # App lifecycle, IPC handlers, schedulers, tray
  preload.ts                # contextBridge API (70+ methods)
  database.ts               # DataSource, CRUD, soft-delete, search
  report-generator.ts       # DOCX generation (JSZip + xmldom)
  entities/                 # TypeORM entity definitions (6 files)
src/                        # Renderer (ESNext, Vite)
  pages/                    # 7 route pages
  components/               # 8 reusable components (AppLayout, Header, TitleBar, SearchBar, EvidenceUpload, ActivityBar, EmptyState, Skeleton)
  contexts/                 # ThemeContext
  services/                 # localDb.ts (browser fallback)
  utils/                    # validation.ts
e2e/                        # Playwright E2E tests
docs/                       # Architecture, roadmap, plans, guides
```

## Conventions

- **Component naming**: PascalCase files and exports (`HomePage.tsx`, `AppLayout.tsx`)
- **Pages** in `src/pages/`, **reusable components** in `src/components/`, **contexts** in `src/contexts/`
- **Entity files**: one entity per file in `electron/entities/`, export related enums from entity file
- **IPC handlers**: registered in `electron/main.ts` at app startup, prefixed (`db:`, `app:`, `window:`)
- **Services** in `src/services/` for browser-fallback helpers (`localDb.ts`)
- **Form pattern**: typed interface for form state, `useEffect` to load, handler to save via IPC
- **Browser fallback**: when `electronAPI` unavailable, uses `localStorage` via `localDb` service
- **Tailwind classes**: use CSS variable tokens (`bg-background`, `text-foreground`, `bg-primary`) — not raw color values
- **Draggable title bar**: Header uses `WebkitAppRegion: 'drag'`, interactive elements use `'no-drag'`
- **Language**: UI strings and comments in Portuguese (pt-BR); code identifiers in English
- **Testing**: unit tests in `*.test.ts` colocated with source, E2E in `e2e/`, use `sql.js` for in-memory DB in tests
- **Soft-delete**: evidences use `deleted_at` timestamp instead of hard delete; trash auto-cleanup after 3 months

## Gotchas

- **TypeScript 6.x + CommonJS**: `tsconfig.electron.json` needs `"ignoreDeprecations": "6.0"` for `node10` module resolution
- **Tailwind v4**: No `tailwind.config.ts` — all theming via `@theme inline` in CSS. See `src/index.css`
- **Electron rebuild**: Native module `better-sqlite3` requires rebuild after install (`postinstall` script handles this)
- **Path alias**: `@/*` maps to `src/*` (frontend only)
- **Asar paths**: icon and asset paths must account for asar packaging (`process.resourcesPath` vs `__dirname`)
- **Custom protocols**: `shipit-evidence://` and `shipit-sfx://` must be used for serving files from userData — direct `file://` is blocked

## Existing Documentation

- [docs/TODO.md](/docs/TODO.md) — Full roadmap with task tracking
- [docs/DEPENDENCIES.md](/docs/DEPENDENCIES.md) — Full dependency audit with versions and system requirements
- [docs/ARCHITECTURE.md](/docs/ARCHITECTURE.md) — High-level system design
- [docs/DEVELOPMENT.md](/docs/DEVELOPMENT.md) — Dev setup guide
- [docs/plan-docx-generator/](/docs/plan-docx-generator/) — DOCX report generation feature plan

## Roadmap Context

All core phases are **complete** (Phases 1–16.1): Foundation, Activity CRUD, Evidence management, Validation, Auto-save, Dashboard, DOCX reports, Settings, Alerts & notifications, Drag & drop reorder, Navigation & menus, UI/UX polish, CI/CD multiplatform builds, 54+ tests, WCAG AA audit, E2E tests, Icons & installers, Search bar, Auto-update. Pending backlog: custom data storage directory (optional, deferred), macOS/Linux tray adjustments.
