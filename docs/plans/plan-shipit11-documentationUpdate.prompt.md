# Plan: Documentation Update for ShipIt v1.2.2

Update all project documentation to reflect the multi-theme system (11 themes) added since v1.2.1, and rewrite README for end users instead of developers.

---

## Phase 1: README.md — Rewrite for End Users

The current README is developer-focused. Rewrite as product documentation in Portuguese (pt-BR).

1. **Keep header** (logo, badges, "Sobre" intro) — add hero placeholder for app screenshot/GIF
2. **Add "Instalação"** — Step-by-step per platform (Windows NSIS/Portable/MSI, macOS DMG, Linux AppImage/deb/rpm), download links to GitHub Releases
3. **Add "Primeiros Passos"** — Guide through: first launch → profile setup → first activity → adding evidences → generating report. Screenshot placeholders at each step
4. **Expand "Funcionalidades"** — Detailed sections for: Dashboard, Activity CRUD, Evidence management, DOCX reports, 11 Themes, System Tray, Alerts, Auto-update, Search, Trash. Each with screenshot placeholder
5. **Add "Temas"** — Showcase 11 themes by category (Principais, Personalidade, Acessibilidade, Bônus Cyberpunk) with preview placeholders
6. **Add "Atalhos e Dicas"** — Power user tips (clipboard paste, tray behavior, auto-save)
7. **Add "Requisitos do Sistema"** — OS requirements, disk space, offline
8. **Add "FAQ"** — Where is data stored? Reports directory? Backup? etc.
9. **Move dev docs** — "Para Desenvolvedores" section at bottom linking to DEVELOPMENT.md, ARCHITECTURE.md, CONTRIBUTING.md, DEPENDENCIES.md, CHANGELOG.md
10. **Keep "Licença" and "Créditos"**

**File**: `README.md`

---

## Phase 2: CHANGELOG.md — Add v1.2.2 Entry

1. **Create `[1.2.2]` section** with:
   - **Added**: 11-theme system (Light, Dark, Colorful, Rose & Violet, Minimalist, Futuristic, Ocean, Sunset, High Contrast, High Contrast Dark, Cyberpunk), ThemeSelector component, cyberpunk effects (CRT scanlines, neon glow, glitch), 60+ CSS variables per theme, WCAG AAA high-contrast themes
   - **Changed**: ThemeContext refactored (dark/light toggle → multi-theme), theme persistence stores theme ID, smooth 200ms transitions
2. **Resolve `[Unreleased]` items** — move to v1.2.2 or keep if still pending
3. **Review existing entries** for accuracy

**File**: `CHANGELOG.md`

---

## Phase 3: docs/TODO.md — Update Task Tracking

1. **Add completed Phase 17: Multi-Theme System** — all sub-tasks marked `[x]`: theme architecture, 11 palettes, ThemeSelector, ThemeContext refactor, SettingsPage integration, cyberpunk effects, smooth transitions
2. **Add new pending items** — Documentation update, carry forward existing pending items (custom storage dir, macOS/Linux tray, template path accents)
3. **Ensure all prior completed phases are properly marked**

**File**: `docs/TODO.md`

---

## Phase 4: .github/copilot-instructions.md — Update Guidelines

1. **Bump version** to 1.2.2
2. **Update Tech Stack table** — add theme system row
3. **Update File Structure** — add `src/themes/` (3 files), update component count to 9
4. **Rewrite Theming section** — 11 themes, 3 categories, `ThemeId` type, `ThemeMetadata`, CSS variable cascade, theme persistence mechanism
5. **Update Components list** — add `ThemeSelector`
6. **Update Roadmap Context** — reflect completed multi-theme phase

**File**: `.github/copilot-instructions.md`

---

## Phase 5: docs/ARCHITECTURE.md — Update Architecture

1. **Add "Multi-Theme Architecture" section** — theme registry pattern (`themes.ts` → `ThemeMetadata[]`), CSS variable cascade (`themes.css` → `[data-theme]` selectors → `@theme inline`), ThemeContext state management, ThemeSelector integration
2. **Update Renderer section** — add `src/themes/` folder, update component count
3. **Update Design Decisions table** — add: CSS variables (zero runtime cost), category system, WCAG AAA high-contrast
4. **Review all counts** (handlers, entities, components) for accuracy

**File**: `docs/ARCHITECTURE.md`

---

## Verification

1. All `.md` files render correctly with no broken internal links
2. Version "1.2.2" consistent across README, CHANGELOG, copilot-instructions
3. README has clear image placeholders (`<!-- Screenshot: ... -->`) for future insertion
4. README contains no developer setup info (moved to linked docs)
5. CHANGELOG captures all multi-theme changes with correct categorization
6. TODO.md phases numbered sequentially and accurately marked

## Decisions

- **Language**: Portuguese (pt-BR) for README — consistent with UI
- **Image placeholders**: `<!-- Screenshot: description -->` HTML comments
- **CHANGELOG date**: current date or placeholder for release
- **Phase numbering**: continues from 16.1 → Phase 17
- **Scope excludes**: CONTRIBUTING.md, DEVELOPMENT.md, DEPENDENCIES.md (not requested), any code changes

## Further Considerations

1. **README screenshots**: Should placeholders specify exact dimensions/format, or just descriptions? *Recommendation*: descriptions only, add images in a follow-up task
2. **CHANGELOG date for v1.2.2**: Use today's date (2026-04-17) or leave as `YYYY-MM-DD` for the actual release? *Recommendation*: use today's date, can be adjusted at release time
3. **E2E theme test**: The current E2E test (`toggles dark/light theme`) uses `input[value="light"]` / `input[value="dark"]` which may be broken by the ThemeSelector refactor — this is outside scope but worth noting for a follow-up fix
