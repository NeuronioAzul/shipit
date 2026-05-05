## Plan: Validacao Titlebar e Release

Validar a release criando uma esteira objetiva para titlebar, busca, historico, menu superior e publicacao. A abordagem recomendada e usar o Playwright Electron existente como camada principal de regressao, complementar com Vitest apenas para pontos pouco observaveis em janela real, corrigir bugs encontrados com mudancas pequenas e so entao executar o fluxo de tag/release com validacao explicita de assets.

**Steps**

### Fase 1 — Baseline e matriz de cobertura
1. Confirmar pre-condicoes locais: branch `dev`, `git status` limpo ou mudancas conhecidas, Node >= 24, npm >= 11, versao atual em `package.json` e ultima tag publicada. A versao-alvo recomendada e patch (`v1.3.1`) se nao houver decisao de produto exigindo minor/major, porque `v1.3.0` ja e a tag/release mais recente.
2. Rodar baseline antes de alterar testes: `npm run build`, `npm run test` e `npm run test:e2e`. Registrar falhas como preexistentes ou relacionadas ao escopo. O E2E deve rodar depois do build para evitar UI stale em `dist/` e `dist-electron/`.
3. Criar uma matriz requisito -> seletor -> expectativa -> tipo de teste. Cobrir explicitamente: `#titlebar-btn-minimize`, `#titlebar-btn-maximize`, `#titlebar-btn-close`, `#searchbar-input`, `#searchbar-magnifier`, `#searchbar-icon`, `#searchbar-results`, `#titlebar-btn-back`, `#titlebar-btn-forward`, menus `file/edit/view/help` e todos os command IDs de `APP_MENU_COMMANDS`.

### Fase 2 — Controles da janela no titlebar
4. Expandir `e2e/app.spec.ts` com testes de clique nos botoes de janela. Usar `page.locator(...).click()` e `app.evaluate(({ BrowserWindow }) => ...)` para observar estado real do `BrowserWindow`.
5. Minimizar: clicar `#titlebar-btn-minimize`, validar `BrowserWindow.isMinimized()` ou evento equivalente, restaurar a janela dentro do teste para nao contaminar os proximos cenarios.
6. Maximizar/restaurar: clicar `#titlebar-btn-maximize`, validar `BrowserWindow.isMaximized()`, conferir mudanca de `title`/`aria-label` de Maximizar para Restaurar, clicar novamente e validar retorno ao estado anterior.
7. Fechar: no E2E principal, validar o comportamento real com tray ativo, ou seja, clique em `#titlebar-btn-close` deve ocultar a janela em vez de encerrar o app. Reexibir a janela via `app.evaluate` ao final. Para o caminho sem tray, usar teste unitario/integracao com mock ou checklist manual, pois encerrar a janela real mata a sessao Playwright.
8. Se algum controle de janela revelar bug, corrigir a raiz em `TitleBar`, `preload` ou `main` e manter o teste regressivo no mesmo ciclo.

### Fase 3 — Busca no titlebar
9. Criar fixtures de atividades com descricoes unicas usando o helper `createActivity` ja existente ou IPC direto, evitando dependencia de estado compartilhado entre testes.
10. Testar campo e icones: `Control+K`/`Cmd+K` deve focar `#searchbar-input`, o icone `#searchbar-magnifier` deve estar visivel, consultas com menos de 2 caracteres nao devem abrir resultados relevantes, e consultas validas devem abrir `#searchbar-results` apos debounce.
11. Testar resultados: validar item encontrado, estado vazio em `#searchbar-empty`, destaque de termo com `<mark>`, limite de resultados exibidos e botao de filtro avancado quando ha resultados.
12. Testar navegacao por teclado: `ArrowDown` seleciona resultado, `ArrowUp` volta a selecao, `Enter` com selecao navega para `/activities/:id`, e `Enter` sem selecao navega para `/activities?search=...`. Se a selecao nao for assertivel de forma robusta, adicionar semantica minima (`role`, `aria-selected` ou IDs estaveis) sem redesenhar o componente.
13. Testar fechamento: `Escape` fecha dropdown e blurra o input; clique fora fecha o dropdown sem navegar.

### Fase 4 — Historico anterior/proximo
14. Manter os testes existentes de historico global, mas ampliar com uma jornada de usuario real: navegar por sidebar/menu/busca, confirmar que cada rota entra no historico e usar `#titlebar-btn-back`/`#titlebar-btn-forward` para voltar/avancar preservando query string.
15. Continuar evitando assertivas frageis de `disabled` quando a janela E2E compartilha historico acumulado; quando necessario, resetar rota via `window.location.hash` e reload controlado antes do cenario.
16. Se houver bug no stack de historico, adicionar teste focado para `NavigationHistoryContext` com Vitest/React Testing Library ou reforcar o E2E, dependendo de onde a falha aparecer.

### Fase 5 — Menu superior completo
17. Expandir E2E de `AppTopMenu`: abrir/fechar secoes com mouse, `Escape` e clique fora; validar navegacao por teclado com `ArrowDown`, `ArrowUp`, `Home`, `End`, `ArrowRight`, `ArrowLeft`, `Enter` e `Tab`.
18. Validar todos os comandos do menu File: `file.new-activity`, `file.settings`, `file.save-context`, `file.open-reports-folder`, `file.open-evidences-folder` e `file.quit`. Para abrir pastas/quit, preferir instrumentacao/mocks no processo Electron ou teste isolado para nao abrir Explorer/encerrar a suite compartilhada.
19. Validar comandos Edit: `edit.focus-search` com UI real; `undo`, `redo`, `cut`, `copy`, `paste` e `select-all` com input/textarea ou instrumentacao de `webContents`, garantindo que cada item chama a acao esperada sem depender de clipboard nativo instavel.
20. Validar comandos View: `zoom-in`, `zoom-out` e `zoom-reset` via `webContents.getZoomFactor()`, alem de `view.window-minimize`, `view.window-maximize` e `view.window-close` reaproveitando os cenarios dos controles da janela.
21. Validar comandos Help: manter `help.user-manual` e `help.report-issue`; adicionar `help.about` observando o evento/modal esperado e `help.check-updates` navegando para Settings e disparando o fluxo de verificacao. Monkey patch de `shell.openExternal` deve ser usado para links externos.
22. Se a cobertura revelar comandos inatingiveis no browser fallback, corrigir estados `requiresElectron`/disabled no menu e testar ambos os caminhos quando fizer sentido.

### Fase 6 — Correcoes e documentacao
23. Corrigir apenas bugs encontrados no escopo titlebar/busca/historico/menu. Evitar refactors amplos e preservar seguranca Electron (`contextIsolation: true`, `nodeIntegration: false`).
24. Atualizar documentacao necessaria: `CHANGELOG.md` com as correcoes/testes, `docs/TODO.md` com status da validacao, e `docs/DEVELOPMENT.md` apenas se contagem/comando de testes mudar.
25. Rodar novamente `npm run build`, `npm run test` e `npm run test:e2e`. Se algum teste for flaky por UI nativa, documentar o motivo e substituir por mock/unitario ou checklist manual verificavel.

### Fase 7 — Tag e publicacao
26. Antes da tag, confirmar release preflight: `git status`, branch `dev`, `gh auth status`, rate limit do GitHub, `CHANGELOG.md` sincronizado e versao-alvo definida. Nao reutilizar tag existente.
27. Rodar primeiro `python docs/scripts/release.py --version <versao> --dry-run` para validar fluxo sem alterar remoto.
28. Executar `python docs/scripts/release.py --version <versao>` ou modo interativo conforme a decisao de versao. O script deve criar/atualizar commit, PR `dev -> main`, merge, tag `vX.Y.Z`, sincronizar `dev` e aguardar CI/CD.
29. Durante a release, monitorar o workflow de tag e confirmar que a release permanece draft ate os builds terminarem. Validar os 14 assets esperados antes de publicar: Windows, macOS e Linux. Se repetir o problema historico da v1.3.0, voltar a release para draft, rerodar o workflow, confirmar assets e so entao publicar.
30. Pos-release: validar `gh release view vX.Y.Z --json isDraft,assets,url`, baixar/abrir ao menos o artefato Windows principal quando possivel, e confirmar que a release publicada aponta como latest.

**Relevant files**
- `e2e/app.spec.ts` — ampliar suites existentes; reutilizar `createActivity`, lancamento Electron e padrao `app.evaluate`.
- `src/components/TitleBar.tsx` — handlers `handleMinimize`, `handleMaximize`, `handleClose`, `executeMenuCommand`, IDs do titlebar e integracao com `SearchBar`/`AppTopMenu`.
- `src/components/SearchBar.tsx` — `handleInputChange`, `handleKeyDown`, `navigateToResult`, `navigateToFilter`, render de icones/resultados.
- `src/components/AppTopMenu.tsx` — `handleSectionKeyDown`, `handleItemKeyDown`, render dos botoes/panels do menu.
- `src/contexts/NavigationHistoryContext.tsx` — stack de historico, `canGoBack`, `canGoForward`, `goBack`, `goForward` e atalhos Alt+Arrow.
- `src/menu/appMenuCatalog.ts` — fonte dos 24 comandos, atalhos e flags `requiresElectron`.
- `src/menu/saveContextRegistry.ts` — base para validar `file.save-context`.
- `src/menu/appMenuCatalog.test.ts` e `src/menu/saveContextRegistry.test.ts` — padroes unitarios existentes para menu e save context.
- `electron/preload.ts` — bridge `window.electronAPI` para controles de janela e comandos do app.
- `electron/main.ts` — handlers `window:minimize`, `window:maximize`, `window:close`, `window:isMaximized`, zoom, edit, abertura de pastas, quit e update.
- `package.json` — scripts e versao de release.
- `CHANGELOG.md` — entradas de release/correcoes.
- `docs/TODO.md` — status da validacao para a release.
- `docs/scripts/release.py` — automacao oficial de tag/release.
- `docs/scripts/RELEASE_GUIDE.md` e `docs/scripts/RELEASE_TROUBLESHOOTING.md` — precondicoes e recuperacao de falhas.
- `.github/workflows/release.yml` — gatilho por tag `v*.*.*`, jobs de build e assets esperados.

**Verification**
1. `npm run build` apos qualquer mudanca em renderer/main antes dos E2E.
2. `npm run test` para Vitest/unit/integration.
3. `npm run test:e2e` para regressao Playwright Electron completa.
4. Execucao focal quando necessario: `npx playwright test e2e/app.spec.ts --grep "titlebar|search|menu|history|window"`.
5. Checklist manual no Windows: arrastar titlebar para mover janela; minimizar/restaurar; maximizar/restaurar; fechar para tray; abrir menus; abrir pastas de relatorios/evidencias; confirmar que quit encerra app; verificar que links externos abrem fora do app.
6. Release dry-run: `python docs/scripts/release.py --version <versao> --dry-run`.
7. Release final: monitorar GitHub Actions, confirmar 14 assets e `isDraft=false` somente depois da validacao.

**Decisions**
- Usar Playwright Electron como fonte principal de confianca para comportamentos de janela/menu, porque a app ja tem suite E2E e IDs estaveis.
- Usar Vitest apenas onde Playwright nao consegue observar sem flakiness ou sem encerrar a propria app, especialmente close sem tray e comandos nativos de webContents.
- Corrigir somente bugs do escopo solicitado; nao incluir redesign, nova funcionalidade de negocio, tray nativo completo ou refatoracoes amplas.
- Versao recomendada para o proximo tag: patch (`v1.3.1`) salvo decisao explicita por minor/major.

**Further Considerations**
1. Alguns itens nativos nao sao 100% automatizaveis no Playwright, como interacao com tray/Explorer. Para eles, combinar instrumentacao/mocks com checklist manual assinado antes da tag.
2. Se os resultados da busca nao tiverem semantica suficiente para assertiva robusta de selecao, adicionar ARIA/IDs pequenos e testar acessibilidade basica no mesmo fluxo.
3. A release v1.3.0 teve historico de publicacao antes dos assets; esta validacao deve tratar a presenca dos 14 assets como gate obrigatorio antes de publicar.