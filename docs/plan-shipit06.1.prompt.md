# Plan: Ícone do App + Release + Instaladores + Busca + Auto-Update UI + Docs

Corrigir o ícone Electron aparecendo no lugar do icone do foguete, gerar instaladores multi-formato com nomes claros por OS/arch, release como draft manual, barra de busca na title bar (estilo VS Code) com filtro avançado, botão de verificar atualização nas Configurações, e atualizar toda a documentação.

---

### Fase 1: Corrigir Ícone do App

**Causa raiz**: `build.win.icon` no `package.json` (linha ~109) aponta para `ms-icon-310x310.png` (PNG), mas Windows precisa de `.ico` para embutir no `.exe` e na taskbar. O arquivo `favicon.ico` já existe em `public/assets/images/icons/` mas não está referenciado.

1. Alterar `build.win.icon` para `public/assets/images/icons/favicon.ico`
2. Verificar que o `favicon.ico` contém resolução 256×256 (mínimo para ícone de app Windows). Se não, regenerar a partir do `ms-icon-310x310.png`
3. Renomear os ícones de `favicon` para `ShipIt` para clareza e organização

---

### Fase 2: Instaladores Multi-formato com Nomes Claros — *paralelo com Fase 1*

4. Adicionar targets Windows: `portable` e `msi` além do `nsis` existente
5. Adicionar targets Linux: `deb` e `rpm` além do `AppImage`
6. Configurar macOS com duas arquiteturas: `arm64` + `x64` (DMGs separados)
7. Definir `artifactName` por target:

| Target | Nome gerado |
|--------|------------|
| NSIS | `ShipIt-1.2.1-Windows-x64-Setup.exe` |
| Portable | `ShipIt-1.2.1-Windows-x64-Portable.exe` |
| MSI | `ShipIt-1.2.1-Windows-x64.msi` |
| DMG | `ShipIt-1.2.1-macOS-arm64.dmg` / `ShipIt-1.2.1-macOS-x64.dmg` |
| AppImage | `ShipIt-1.2.1-Linux-x86_64.AppImage` |
| deb | `ShipIt-1.2.1-Linux-amd64.deb` |
| rpm | `ShipIt-1.2.1-Linux-x86_64.rpm` |

**Arquivo**: `package.json` — seção `build`

---

### Fase 3: Workflow de Release — *depende de Fase 2*

8. Adicionar job `create-release` que roda primeiro: cria a GitHub Release como **draft** com título descritivo (ex: `v1.2.1`) — você revê e publica manualmente
9. Os 3 build jobs (`build-windows`, `build-macos`, `build-linux`) dependem de `create-release` e publicam os artefatos no draft
10. No macOS, gerar dois DMGs com `electron-builder --mac --arm64 --x64`
11. Atualizar upload paths para incluir `*.msi`, `*.deb`, `*.rpm`

**Arquivo**: `.github/workflows/release.yml`

---

### Fase 4: Botão "Verificar Atualização" nas Configurações — *paralelo com Fases 1-3*

**Contexto**: O `electron-updater` já roda no startup (`autoUpdater.checkForUpdatesAndNotify()`), mas não há como o usuário disparar verificação manual. A `SettingsPage` tem seções: Aparência, Diretório, Som, Comportamento, Notificações, Perfil, Sobre.

12. Adicionar IPC handler `app:checkForUpdate` em `electron/main.ts` — chama `autoUpdater.checkForUpdatesAndNotify()`
13. Adicionar IPC handler `app:installUpdate` — chama `autoUpdater.quitAndInstall()`
14. Adicionar listeners do `autoUpdater` que enviam estado para o renderer via `webContents.send()`:
    - `update-available` → versão disponível
    - `update-downloaded` → pronto para instalar
    - `update-not-available` → na versão mais recente
    - `error` → mensagem de erro
15. Expor `checkForUpdate()`, `installUpdate()` e `onUpdateStatus(callback)` no preload + `ElectronAPI`
16. Adicionar seção "Atualizações" na `SettingsPage.tsx` (junto da seção "Sobre"):
    - Botão "Verificar atualizações"
    - Estados: "Verificando...", "Versão mais recente ✓", "Versão X.Y.Z disponível — Baixando...", "Pronta — Reiniciar para instalar"
    - Botão "Reiniciar e atualizar" só quando downloaded
    - Em dev: "Disponível apenas na versão instalada"

**Arquivos**: `electron/main.ts`, `electron/preload.ts`, `src/vite-env.d.ts`, `src/pages/SettingsPage.tsx`

---

### Fase 5: Barra de Busca na Title Bar — *paralelo com Fases 1-4*

**Contexto**: Layout = `TitleBar` (logo + controls) + `ActivityBar` (sidebar) + content. Não existe busca. `getActivities(monthRef)` só filtra por mês.

#### 5A: Backend — IPC de busca

17. Criar `searchActivities(query)` em `electron/database.ts` — `LIKE %query%` em `Activity.description`, `project_scope`, `link_ref` + join `Evidence.caption`. Retorna atividades de qualquer mês
18. Registrar IPC handler `db:searchActivities` em `main.ts`
19. Expor `searchActivities(query)` no preload e `ElectronAPI`

#### 5B: Componente SearchBar (Command Palette style)

20. Criar `src/components/SearchBar.tsx`:
    - Input centralizado na TitleBar, entre logo e window controls
    - Ícone de lupa, placeholder "Buscar atividades... (Ctrl+K)"
    - Atalho `Ctrl+K` / `Cmd+K` abre/foca o input
    - Dropdown de resultados (overlay) com: descrição truncada, mês/ano, status badge, indicador de match em evidência
    - Clicar navega para `/activities/:id`
    - Debounce 300ms
    - Botão "Filtro avançado" → navega para `/activities?search=QUERY`
21. Integrar na `TitleBar.tsx` com `WebkitAppRegion: 'no-drag'`

#### 5C: Filtro completo na ActivitiesPage

22. Expandir `ActivitiesPage.tsx` com painel de filtros (toggle):
    - Filtros: texto livre, status, tipo de atendimento, escopo, período, mês
    - Pills/badges removíveis para filtros ativos
    - SearchBar pré-preenche o texto ao navegar para cá

**Arquivos**: `electron/database.ts`, `electron/main.ts`, `electron/preload.ts`, `src/vite-env.d.ts`, `src/components/SearchBar.tsx` (novo), `src/components/TitleBar.tsx`, `src/pages/ActivitiesPage.tsx`

---

### Fase 6: Documentação — *após todas as fases*

23. **README.md**: Download expandido com todos os formatos, guia "Qual versão baixar?", badge release
24. **CHANGELOG.md**: documentar tudo (ícone, multi-formato, busca, auto-update UI)
25. **docs/TODO.md**: marcar concluídos, adicionar novas fases
26. **docs/DEVELOPMENT.md**: atualizar CI/CD + novos targets

---

## Arquivos a criar/modificar

- `package.json` — `build.win.icon` → `.ico`, targets Windows (nsis + portable + msi), targets Linux (AppImage + deb + rpm), macOS arch, `artifactName` por target
- `.github/workflows/release.yml` — job `create-release` (draft), macOS `--arm64 --x64`, upload patterns
- `electron/main.ts` — IPC handlers `app:checkForUpdate`, `app:installUpdate`, listeners autoUpdater → renderer
- `electron/preload.ts` — expor `checkForUpdate`, `installUpdate`, `onUpdateStatus`
- `electron/database.ts` — função `searchActivities(query)` com LIKE + join Evidence
- `src/vite-env.d.ts` — tipos para busca e auto-update
- `src/components/SearchBar.tsx` — **NOVO** — barra de busca command palette style
- `src/components/TitleBar.tsx` — integrar SearchBar no centro
- `src/pages/SettingsPage.tsx` — seção "Atualizações" com botão e estados
- `src/pages/ActivitiesPage.tsx` — painel de filtros completo
- `README.md`, `CHANGELOG.md`, `docs/TODO.md`, `docs/DEVELOPMENT.md`

---

## Verificação

1. `favicon.ico` tem resolução ≥256×256
2. `npm run build` passa
3. `npm test` — 55 testes passando
4. Tag `v1.2.1-beta.2` → draft no GitHub Releases com todos os artefatos (~8 instaladores)
5. Instalar `.exe` → ícone do foguete na taskbar e no programa
6. SettingsPage: "Verificar atualizações" mostra estado correto (em dev: indisponível)
7. `Ctrl+K` abre busca, digitando retorna atividades de qualquer mês
8. Clicar resultado → navega para atividade
9. Filtro avançado → painel completo na ActivitiesPage

## Decisões

- Release como **draft manual** — você revê o título/notas e publica
- Windows: NSIS + Portable + MSI (x64)
- macOS: dois DMGs separados (arm64 + x64)
- Linux: AppImage + deb + rpm
- Sem code signing (mantido)
- Busca estilo VS Code command palette (`Ctrl+K`)
- LIKE em `description`, `project_scope`, `link_ref`, `Evidence.caption`
- Filtro completo na ActivitiesPage com todos os campos
- Auto-update UI na SettingsPage com estados visuais claros

## Considerações

1. **MSI**: pode precisar de WiX Toolset no runner. Testar e remover se falhar.
2. **macOS x64**: cross-compile no ARM runner pode aumentar tempo de build.
3. **Tamanho da Release**: ~1.2 GB total.
4. **Busca full-text**: LIKE é suficiente para o volume atual. Migrar para FTS5 se crescer.
