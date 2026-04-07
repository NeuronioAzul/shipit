# ShipIt — Project Guidelines

Electron desktop app for software engineers to track activities, generate service reports, and manage evidence. Built with Electron 41 + React 19 + Vite 8 + TypeORM + better-sqlite3.

## Tech Stack

| Layer | Tech | Notes |
|-------|------|-------|
| Desktop | Electron 41 (CommonJS) | Context isolation, preload bridge |
| UI | React 19 + React Router 7 | SPA with `AppLayout` wrapper |
| Styling | Tailwind CSS 4 | `@theme inline` in `src/index.css`, no config file |
| ORM | TypeORM 0.3 + better-sqlite3 | SQLite stored in `userData/shipit.db` |
| Build | Vite 8 | `@vitejs/plugin-react` + `@tailwindcss/vite` |
| Language | TypeScript 6 | Strict mode everywhere |
| Icons | Font Awesome 7 | Self-hosted via npm, imported in CSS |

## Build & Dev Commands

```bash
npm run dev       # Vite dev server + Electron (concurrently + wait-on)
npm run build     # tsc → vite build → tsc electron
npm run dist      # build + electron-builder package
npm run preview   # Vite preview
```

Requires **Node.js ≥ 24**, **npm ≥ 11**. After cloning, `npm install` triggers `postinstall` for native module rebuild.

## Architecture

### Process Boundary

```
Renderer (React/Vite)          Preload Bridge              Main (Electron/Node)
  window.electronAPI  ──────>  contextBridge  ──────>  ipcMain.handle('db:*', 'app:*')
                               electron/preload.ts         electron/main.ts
                                                           electron/database.ts
```

- **Main process** (`electron/`): CommonJS, `tsconfig.electron.json`, outputs to `dist-electron/`
- **Renderer** (`src/`): ESNext, `tsconfig.json`, bundled by Vite
- **IPC pattern**: `ipcRenderer.invoke` ↔ `ipcMain.handle` with `db:` and `app:` prefixes
- **Security**: `contextIsolation: true`, `nodeIntegration: false` — never change these

### Browser Fallback

When `window.electronAPI` is unavailable (browser dev), components fall back to `localStorage`. Always check availability before calling IPC methods.

### Database

- Singleton `DataSource` initialized lazily via `getDb()` in `electron/database.ts`
- `synchronize: true` — schema auto-updates from entity definitions (dev only)
- Entities use TypeORM decorators with UUID v7 primary keys (except `UserProfile` which uses auto-increment)

### Theming

- CSS variables defined in `src/index.css` under `@theme inline` (Tailwind v4 pattern)
- Light/dark via `.dark` class on `<html>`, managed by `ThemeContext`
- Brand colors: primary blue (`hsl 216 64% 30%`), accent orange (`hsl 24 89% 54%`)
- Persist theme choice in `localStorage.shipit-theme`

## Conventions

- **Component naming**: PascalCase files and exports (`HomePage.tsx`, `AppLayout.tsx`)
- **Pages** in `src/pages/`, **reusable components** in `src/components/`, **contexts** in `src/contexts/`
- **Entity files**: one entity per file in `electron/entities/`, export related enums from entity file
- **IPC handlers**: registered in `electron/main.ts` at app startup, prefixed (`db:`, `app:`)
- **Form pattern**: typed interface for form state, `useEffect` to load, handler to save via IPC
- **Tailwind classes**: use CSS variable tokens (`bg-background`, `text-foreground`, `bg-primary`) — not raw color values
- **Draggable title bar**: Header uses `WebkitAppRegion: 'drag'`, interactive elements use `'no-drag'`
- **Language**: UI strings and comments in Portuguese (pt-BR); code identifiers in English

## Gotchas

- **TypeScript 6.x + CommonJS**: `tsconfig.electron.json` needs `"ignoreDeprecations": "6.0"` for `node10` module resolution
- **Tailwind v4**: No `tailwind.config.ts` — all theming via `@theme inline` in CSS. See `src/index.css`
- **Electron rebuild**: Native module `better-sqlite3` requires rebuild after install (`postinstall` script handles this)
- **Path alias**: `@/*` maps to `src/*` (frontend only)

## Existing Documentation

- [docs/DEPENDENCIES.md](docs/DEPENDENCIES.md) — Full dependency audit with versions and system requirements
- [docs/plan-docx-generator/](docs/plan-docx-generator/) — DOCX report generation feature plan (Phase 2.5+)

## Roadmap Context

Phase 1 (Foundation) is complete. Phase 2.5 will add a dashboard replacing the current HomePage placeholder and DOCX report generation capability.
