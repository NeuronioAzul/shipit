# Plan: ShipIt Icon & Windows Installer Customization

Fix the ShipIt icon not appearing in desktop/taskbar/exe (showing Electron icon instead) by correcting the BrowserWindow icon, and customize the NSIS installer to ask about desktop shortcut on install and data cleanup on uninstall.

---

## Issues Found

| Issue | Location | Root Cause |
|-------|----------|------------|
| Window/taskbar shows Electron icon | `electron/main.ts` L30 | Uses `favicon-96x96.png` instead of `ShipIt.ico` — Windows needs `.ico` with multiple sizes |
| Previous build used wrong icon | `release/builder-effective-config.yaml` L22 | Resolved to `ms-icon-310x310.png` (ShipIt.ico likely didn't exist then). Current `package.json` is correct |
| No desktop shortcut user choice | `package.json` NSIS section | Missing checkbox — shortcut auto-created with no user prompt |
| No uninstall data cleanup | No NSIS custom script | Standard uninstaller leaves `%APPDATA%\shipit` intact silently |

---

## Steps

### Phase 1 — Fix Window/Taskbar Icon

1. **Update BrowserWindow icon in `electron/main.ts`** — Use `ShipIt.ico` on Windows (`process.platform === 'win32'`), keep `favicon-96x96.png` for other platforms. This fixes the taskbar, alt-tab, and title bar icons.

### Phase 2 — NSIS Desktop Shortcut Checkbox

2. **Create `build/installer.nsh`** (new file) — Custom NSIS include with:
   - A custom installer page with checkbox "Criar atalho na Área de Trabalho" (checked by default)
   - `customInstall` macro that conditionally creates the shortcut based on checkbox state

3. **Update NSIS config in `package.json`** — Add `"include": "build/installer.nsh"` and set `"createDesktopShortcut": false` (handled manually by NSIS script)

### Phase 3 — Uninstall Data Cleanup Prompt

4. **Add uninstall logic to `build/installer.nsh`** — `customUnInstall` macro that shows a MessageBox:
   - "Deseja excluir todos os dados do aplicativo (banco de dados, evidências, relatórios e configurações)?"
   - **Yes** → deletes `%APPDATA%\${APP_PACKAGE_NAME}` (shipit.db, evidences/, trash/, settings.json, reports/)
   - **No** → preserves all user data

---

## Relevant Files

- `electron/main.ts` L30 — Change `icon` in `createWindow()` to use `ShipIt.ico` on Windows
- `package.json` NSIS section — Update: add `include`, set `createDesktopShortcut: false`
- `build/installer.nsh` — **NEW FILE**: NSIS include with desktop shortcut checkbox + uninstall cleanup prompt
- `public/assets/images/icons/ShipIt.ico` — Already exists (16/32/48/64/128/256px, 32-bit), no changes

---

## Data at Risk on Uninstall (all in `%APPDATA%\shipit\`)

- `shipit.db` — SQLite database (activities, profiles, alerts, reports)
- `evidences/` + `trash/` — Evidence files
- `settings.json` — App configuration
- `reports/` — Generated DOCX reports

---

## Verification

1. `npm run build` → no build errors
2. `npm run dist` → electron-builder console shows `ShipIt.ico` as icon source
3. **Install** the generated `.exe` → verify ShipIt icon in installer, verify "Criar atalho na Área de Trabalho" checkbox works (checked/unchecked)
4. **Run installed app** → verify ShipIt icon in taskbar, alt-tab, title bar, and `.exe` in Explorer
5. **Uninstall** → verify cleanup dialog appears → test both "Yes" (folder deleted) and "No" (folder preserved)

---

## Decisions

- Platform-conditional icon in BrowserWindow (`.ico` on Windows, `.png` on others)
- Desktop shortcut checkbox **checked by default** (most users want it)
- All UI strings in Portuguese (pt-BR) matching app language
- Tray icon unchanged (uses separate rocket PNG)
- Portable build unaffected (no installer/uninstaller)
