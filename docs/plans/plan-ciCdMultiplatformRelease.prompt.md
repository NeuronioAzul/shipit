# Plan: CI/CD — Build & Release Multiplataforma

Criar um workflow GitHub Actions disparado por tags semver (`v*.*.*`) que builda o ShipIt! em paralelo para Windows (.exe), macOS (.dmg) e Linux (.AppImage), publica no GitHub Releases, e integra auto-update via `electron-updater`. Sem code signing por agora. Ícone macOS (`apple-icon.icns`) já disponível no repositório.

---

### Fase A: Dependência de Auto-Update

1. Instalar `electron-updater` como dependência de produção
2. Adicionar config `publish` (`provider: github`, `owner: NeuronioAzul`, `repo: shipit`) no `build` do `package.json` — o electron-builder gera `latest.yml` / `latest-mac.yml` / `latest-linux.yml` automaticamente
3. Adicionar lógica de auto-update em `electron/main.ts` (~15 linhas): importar `autoUpdater`, chamar `checkForUpdatesAndNotify()` após `app.whenReady()` (apenas quando `app.isPackaged`), notificar o usuário sem forçar restart

### Fase B: Workflow GitHub Actions — *paralelo com Fase A*

4. Atualizar `build.mac.icon` no `package.json` para `public/assets/images/icons/apple-icon.icns`
5. Criar `.github/workflows/release.yml` com:
   - **Trigger**: `push: tags: ['v*.*.*']`
   - **3 jobs paralelos**:
     - `build-windows` (`windows-latest`): checkout → node 24 → `npm ci` → `npm test` → `npm run build` → `electron-builder --win --publish always`
     - `build-macos` (`macos-13` — Intel, mais barato em minutos): checkout → node 24 → `npm ci` → `npm test` → `npm run build` → `electron-builder --mac --publish always`
     - `build-linux` (`ubuntu-latest`): checkout → node 24 → `npm ci` → `npm test` → `npm run build` → `electron-builder --linux --publish always`
   - **Env**: `GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}` (built-in, sem config)
   - **Permissions**: `contents: write`
   - Cada job roda `npm test` (55 testes unitários) como gate antes do build

### Fase C: Ajustes de Compatibilidade

6. Verificar se o path do DOCX template com acentos (`docs/Relatórios 2026/...`) funciona no Linux/macOS runner — se falhar, renomear para path ASCII-safe e atualizar `extraResources`

### Fase D: Documentação

7. Atualizar `docs/TODO.md` — marcar itens da Fase 9 (Distribuição Multiplataforma) e CI/CD
8. Atualizar `CHANGELOG.md` — documentar CI/CD + auto-update

---

## Arquivos a criar/modificar

- **NOVO**: `.github/workflows/release.yml` — workflow principal de release
- `package.json` — adicionar `electron-updater` dep + `publish` config no `build` key
- `electron/main.ts` — adicionar `autoUpdater.checkForUpdatesAndNotify()` após `app.whenReady()`, com eventos `update-available` e `update-downloaded`
- `docs/TODO.md` + `CHANGELOG.md`

## Verificação

1. `npm run build` — deve continuar passando localmente
2. `npm run test` — 55 testes passando
3. Criar tag `v1.2.1-beta.1` para testar workflow sem poluir releases
4. Verificar GitHub Release criado com 3 artefatos + 3 `latest*.yml`
5. Baixar e testar `.exe` localmente
6. Após publicar v1.2.1, a v1.2.0 deve notificar sobre update

## Decisões

- Sem code signing (macOS pede "Abrir mesmo assim" manualmente)
- Trigger apenas por tag semver
- Auto-update notifica mas não força restart
- `.icns` commitado no repo (`public/assets/images/icons/apple-icon.icns`, 134 KB, válido)
- Testes unitários como gate; E2E omitido da CI por agora

## Considerações

1. **GitHub Actions minutes**: macOS consome 10x mais minutos. Free tier = 2000 min/mês, mas macOS equivale a ~200 min. Cada build ~5-8 min. Usar `macos-13` (Intel) em vez de `macos-latest` (ARM) economiza.
2. **Draft release**: Alternativa de publicar como draft para review manual antes de tornar público — mudar `--publish always` para `--publish onTagOrDraft`.
3. **DOCX template path**: Acentos no path podem falhar no Linux — testamos na primeira run e ajustamos se necessário.
